import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Send, X, Bot, Trash2 } from "lucide-react";
import { AIMessage } from "@/hooks/useTerminalAI";
import ReactMarkdown from "react-markdown";

interface AIAssistantOverlayProps {
  visible: boolean;
  messages: AIMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export const AIAssistantOverlay = ({
  visible,
  messages,
  isLoading,
  onSend,
  onClear,
  onClose,
}: AIAssistantOverlayProps) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">Inky Assistente</h3>
            <p className="text-white/50 text-xs">Seu assistente inteligente de varejo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClear} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white" title="Limpar histórico">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/40 gap-4">
            <Bot className="w-16 h-16" />
            <p className="text-lg">Como posso ajudar?</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {["Quais promoções ativas?", "Status dos dispositivos", "Métricas de audiência"].map(q => (
                <button
                  key={q}
                  onClick={() => onSend(q)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-sm text-white/70 hover:text-white transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3",
              msg.role === "user"
                ? "bg-primary text-white rounded-br-md"
                : "bg-white/10 text-white/90 rounded-bl-md"
            )}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
              <p className="text-[10px] text-white/30 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-primary hover:bg-primary/80 disabled:opacity-50 rounded-xl text-white transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
