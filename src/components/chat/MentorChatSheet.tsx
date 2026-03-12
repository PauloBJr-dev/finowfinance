import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { useAISettings } from "@/hooks/use-ai";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Trash2, Square, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import mentorIcon from "@/assets/finow-icon-96.png";
import { PremiumGate } from "@/components/shared/PremiumGate";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function formatMarkdownSimple(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>');
}

const QUICK_SUGGESTIONS = [
  "Como estão meus gastos este mês?",
  "Tenho metas ativas?",
  "Quais contas vencem em breve?",
];

interface MentorChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MentorChatSheet({ open, onOpenChange }: MentorChatSheetProps) {
  const { plan } = useAuth();
  const isPremium = plan === "premium" || plan === "lifetime";
  const { messages, isStreaming, isLoadingContext, sendMessage, clearChat, stopStreaming } = useChat();
  const { data: aiSettings } = useAISettings();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasLimitedAccess =
    aiSettings &&
    !aiSettings.allow_coach_use_transactions &&
    !aiSettings.allow_coach_use_goals;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text?: string) => {
    const trimmed = (text ?? input).trim();
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="border-b px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={mentorIcon} alt="Mentor" className="h-6 w-6 rounded" />
              <SheetTitle className="text-lg font-semibold">Mentor Financeiro</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={clearChat} title="Limpar conversa" className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {!isPremium ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <PremiumGate inline featureName="Mentor IA">
              {null}
            </PremiumGate>
          </div>
        ) : (
          <>
            {/* Limited access banner */}
            {hasLimitedAccess && (
              <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2 text-xs text-muted-foreground flex-shrink-0">
                <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
                <span>O mentor tem acesso limitado aos seus dados. Ative permissões em Configurações → IA para respostas mais personalizadas.</span>
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md space-y-4 text-center">
                    <img src={mentorIcon} alt="Mentor" className="mx-auto h-10 w-10 opacity-40" />
                    <h2 className="text-lg font-medium">Olá! Sou seu mentor financeiro 👋</h2>
                    <p className="text-sm text-muted-foreground">
                      Me pergunte sobre seus gastos, metas, ou peça dicas para organizar suas finanças.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {QUICK_SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSend(s)}
                          className="rounded-full border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mx-auto max-w-2xl space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col",
                      msg.role === "user" ? "items-end" : "items-start"
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
                    {msg.role === "assistant" && msg.dataPoints && msg.dataPoints.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1 pl-1">
                        {msg.dataPoints.map((dp) => (
                          <Badge key={dp} variant="outline" className="text-[10px] font-normal text-muted-foreground">
                            {dp}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoadingContext && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Analisando seus dados…
                    </div>
                  </div>
                )}

                {isStreaming && !isLoadingContext && messages[messages.length - 1]?.role !== "assistant" && (
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
            <div className="border-t px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex-shrink-0">
              <div className="mx-auto flex max-w-2xl items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte sobre suas finanças…"
                  className="!min-h-[44px] max-h-32 resize-none"
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
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    title="Enviar"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
