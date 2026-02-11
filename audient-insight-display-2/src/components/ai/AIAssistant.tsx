import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Send, X, Minimize2, Maximize2, Bot, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Olá! Sou o assistente virtual da MUPA. Posso ajudar você a gerenciar playlists, criar conteúdos ou tirar dúvidas sobre a plataforma. Como posso ajudar hoje?",
      timestamp: new Date(),
    },
  ]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { query: userMessage.content, messages: messages.map(m => ({ role: m.role, content: m.content })) },
      });

      if (error) {
        console.error("AI Error:", error);
        // Fallback for demo purposes if function is not deployed
        setTimeout(() => {
            const fallbackMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Desculpe, a função de IA ainda não está implantada no backend (Edge Function 'ai-assistant'). Por favor, verifique a configuração do Supabase.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, fallbackMessage]);
            setIsLoading(false);
        }, 1000);
        return;
      }

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response || "Entendido.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      
      if (data.action_taken) {
        toast({
          title: "Ação realizada",
          description: data.action_description || "O assistente processou sua solicitação.",
        });
      }

    } catch (err) {
      console.error("Error sending message:", err);
      toast({
        title: "Erro",
        description: "Falha ao comunicar com o assistente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence mode="wait">
          {!isOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                onClick={() => setIsOpen(true)}
                size="icon"
                className="h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                <Sparkles className="h-7 w-7" />
              </Button>
            </motion.div>
          )}

          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                height: isMinimized ? "auto" : "500px",
                width: "380px"
              }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="origin-bottom-right"
            >
              <Card className="w-full h-full shadow-2xl border-purple-500/20 bg-background/95 backdrop-blur-md flex flex-col overflow-hidden">
                <CardHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold">MUPA AI</CardTitle>
                        <p className="text-xs text-muted-foreground">Assistente Inteligente</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(!isMinimized)}>
                      {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                {!isMinimized && (
                  <>
                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                        <ScrollArea ref={scrollAreaRef} className="h-full p-4">
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {msg.role === "assistant" && (
                                            <Avatar className="h-8 w-8 mt-1 border border-purple-500/20">
                                                <AvatarFallback className="bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">AI</AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                                msg.role === "user"
                                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                                    : "bg-muted text-foreground rounded-tl-none border border-border"
                                            }`}
                                        >
                                            {msg.content}
                                        </div>
                                        {msg.role === "user" && (
                                            <Avatar className="h-8 w-8 mt-1">
                                                <AvatarFallback className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                                                    <User className="h-4 w-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-3 justify-start">
                                        <Avatar className="h-8 w-8 mt-1 border border-purple-500/20">
                                            <AvatarFallback className="bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">AI</AvatarFallback>
                                        </Avatar>
                                        <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 border border-border flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">Processando...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="p-3 bg-muted/30 border-t shrink-0">
                      <div className="flex w-full items-center gap-2">
                        <Input
                          placeholder="Digite sua mensagem..."
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={isLoading}
                          className="flex-1 bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-purple-500"
                        />
                        <Button 
                            onClick={handleSendMessage} 
                            disabled={isLoading || !input.trim()} 
                            size="icon"
                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
