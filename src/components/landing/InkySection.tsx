import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import inkyMascot from "@/assets/inky-mascot.svg";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const INKY_SUGGESTIONS = [
  "O que a MUPA faz?",
  "Como funciona a IA de audiência?",
  "Quais planos estão disponíveis?",
  "Como integrar com minha rede de lojas?",
];

export const InkySection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Oii! 🐙 Eu sou o **Inky**, o assistente virtual da MUPA! Tenho 8 braços pra te ajudar com qualquer dúvida sobre nossa plataforma de Digital Signage. Manda sua pergunta!",
    },
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke(
        "inky-landing",
        { body: { messages: conversationMessages } }
      );

      const aiContent =
        !error && data?.response
          ? data.response
          : "Ops, parece que meus tentáculos se enrolaram! 🐙 Tente novamente em instantes.";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: aiContent,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Ops, algo deu errado. Tente novamente! 🐙",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <section
      id="inky"
      ref={sectionRef}
      className="py-16 md:py-28 bg-black relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-600/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/20 mb-6">
              <img src={inkyMascot} alt="Inky" className="w-6 h-6" />
              <span className="text-xs font-semibold text-cyan-300 tracking-wide uppercase">
                Conheça o Inky
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Tem dúvidas?{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                Pergunte ao Inky
              </span>
            </h2>

            <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-xl">
              O Inky é o nosso polvo assistente — assim como a mascote da MUPA,
              ele está sempre pronto para estender um tentáculo e te ajudar.
              Pergunte sobre recursos, planos, integrações ou qualquer coisa
              sobre a plataforma.
            </p>

            {/* Octopus illustration with tentacles animation */}
            <div className="hidden md:flex items-end gap-6">
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="select-none"
              >
                <img src={inkyMascot} alt="Inky mascot" className="w-24 h-24" />
              </motion.div>
              <div className="space-y-2 pb-3">
                {["Inteligente", "Rápido", "Simpático"].map((tag) => (
                  <span
                    key={tag}
                    className="inline-block mr-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — Chat */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-2xl shadow-cyan-500/5 overflow-hidden flex flex-col" style={{ height: 480 }}>
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3 bg-white/[0.02]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center">
                  <img src={inkyMascot} alt="Inky" className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Inky</div>
                  <div className="text-xs text-cyan-400/80 flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    Online agora
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/20 flex items-center justify-center text-sm mr-2 mt-1 shrink-0">
                          <img src={inkyMascot} alt="Inky" className="w-5 h-5" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-cyan-600/80 text-white rounded-tr-none"
                            : "bg-white/[0.06] text-gray-200 rounded-tl-none border border-white/10"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/20 flex items-center justify-center text-sm mr-2 mt-1 shrink-0">
                        <img src={inkyMascot} alt="Inky" className="w-5 h-5" />
                      </div>
                      <div className="bg-white/[0.06] rounded-2xl rounded-tl-none px-4 py-3 border border-white/10 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                        <span className="text-xs text-gray-400">
                          Inky pensando...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Suggestions */}
              {messages.length <= 2 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {INKY_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      disabled={isLoading}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder="Pergunte algo ao Inky..."
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-cyan-500/50"
                  />
                  <Button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
