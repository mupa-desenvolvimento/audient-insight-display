
/**
 * Service to simulate AI text generation and suggestions
 * In a real implementation, this would call an backend API (OpenAI/Gemini)
 */

export const aiService = {
  /**
   * Generate a suggestion for a specific field based on context
   */
  async generateSuggestion(field: string, context: string, currentContent: string): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const suggestions: Record<string, string[]> = {
      title: [
        "Inovação em Cada Pixel",
        "Tecnologia que Transforma",
        "O Futuro do Varejo",
        "Inteligência Artificial Aplicada",
        "Resultados Comprovados"
      ],
      subtitle: [
        "Mais eficiência para sua operação",
        "Conectando dados e pessoas",
        "A revolução do digital signage",
        "Simples, Rápido e Eficiente"
      ],
      description: [
        "Nossa solução utiliza algoritmos avançados para entregar resultados precisos em tempo real, maximizando o ROI.",
        "Transforme a experiência do cliente com interações personalizadas e conteúdo dinâmico baseado em dados.",
        "Gerencie toda sua rede de dispositivos de forma centralizada, garantindo consistência e agilidade na comunicação.",
        "Aumente o engajamento do público alvo através de métricas detalhadas e insights acionáveis."
      ]
    };

    // Simple heuristic to return a random suggestion different from current
    const options = suggestions[field] || ["Conteúdo aprimorado pela IA"];
    const filtered = options.filter(s => s !== currentContent);
    return filtered[Math.floor(Math.random() * filtered.length)] || options[0];
  },

  /**
   * Improve existing text
   */
  async improveText(text: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1200));
    return text + " (Aprimorado pela IA para maior impacto e clareza)";
  }
};
