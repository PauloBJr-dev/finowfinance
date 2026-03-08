import { useState, useCallback, useRef } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  dataPoints?: string[];
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finow-chat`;

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (input: string) => {
    const userMsg: ChatMessage = { role: "user", content: input.slice(0, 500) };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);
    setIsLoadingContext(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = "";
    let receivedFirstChunk = false;
    let pendingDataPoints: string[] | undefined;

    const upsert = (chunk: string) => {
      if (!receivedFirstChunk) {
        receivedFirstChunk = true;
        setIsLoadingContext(false);
      }
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    const applyDataPoints = (dp: string[]) => {
      pendingDataPoints = dp;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, dataPoints: dp } : m
          );
        }
        return prev;
      });
    };

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem resposta do servidor");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      const processLine = (line: string) => {
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") return false;
        if (!line.startsWith("data: ")) return false;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return true; // done

        try {
          const parsed = JSON.parse(jsonStr);
          // Check for meta event (data_points)
          if (parsed.meta?.data_points) {
            applyDataPoints(parsed.meta.data_points);
            return false;
          }
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) upsert(content);
        } catch {
          // ignore parse errors
        }
        return false;
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          const line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (processLine(line)) {
            streamDone = true;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (const raw of textBuffer.split("\n")) {
          if (!raw) continue;
          processLine(raw);
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const errMsg = `⚠ ${err.message || "Erro ao conectar com o mentor."}`;
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: errMsg } : m
          );
        }
        return [...prev, { role: "assistant", content: errMsg }];
      });
    } finally {
      setIsStreaming(false);
      setIsLoadingContext(false);
      abortRef.current = null;
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, isLoadingContext, sendMessage, clearChat, stopStreaming };
}
