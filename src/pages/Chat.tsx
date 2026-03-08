import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Trash2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import mentorIcon from "@/assets/finow-icon-96.png";
import { PremiumGate } from "@/components/shared/PremiumGate";
import { useAuth } from "@/hooks/use-auth";

function formatMarkdownSimple(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>');
}

export default function Chat() {
  const { plan } = useAuth();
  const isPremium = plan === "premium" || plan === "lifetime";
  const { messages, isStreaming, sendMessage, clearChat, stopStreaming } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={mentorIcon} alt="Mentor" className="h-6 w-6 rounded" />
            <h1 className="text-lg font-semibold">Mentor Financeiro</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={clearChat} title="Limpar conversa">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md space-y-3 text-center">
                <img src={mentorIcon} alt="Mentor" className="mx-auto h-10 w-10 opacity-40" />
                <h2 className="text-lg font-medium">Olá! Sou seu mentor financeiro 👋</h2>
                <p className="text-sm text-muted-foreground">
                  Me pergunte sobre seus gastos, metas, ou peça dicas para organizar suas finanças.
                  Eu analiso seus dados reais para dar respostas personalizadas.
                </p>
              </div>
            </div>
          )}

          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <div
                    className="whitespace-pre-wrap [&_strong]:font-semibold [&_em]:italic [&_code]:font-mono"
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdownSimple(msg.content),
                    }}
                  />
                </div>
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.15s" }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>●</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre suas finanças…"
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              maxLength={500}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button size="icon" variant="outline" onClick={stopStreaming} title="Parar">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim()}
                title="Enviar"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
      </div>
    </MainLayout>
  );

  if (!isPremium) {
    return (
      <PremiumGate featureName="Mentor IA">
        {null}
      </PremiumGate>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-4rem)]">
        {/* re-render full chat content inline */}
      </div>
    </MainLayout>
  );
}
