import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export const useTerminalAI = (deviceCode: string) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef(`session_${Date.now()}`);

  const sendMessage = useCallback(async (text: string) => {
    const userMessage: AIMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversationMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("inky-chat", {
        body: {
          messages: conversationMessages,
          mode: "operational",
        },
      });

      if (error) throw error;

      const assistantMessage: AIMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: "assistant",
        content: data?.response || data?.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.",
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error("[TerminalAI] Error:", err);
      const errorMessage: AIMessage = {
        id: `msg_${Date.now()}_error`,
        role: "assistant",
        content: "Erro ao processar. Tente novamente.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, deviceCode]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = `session_${Date.now()}`;
  }, []);

  return { messages, isLoading, sendMessage, clearHistory };
};
