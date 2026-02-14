import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Você é o Inky 🐙, assistente virtual inteligente da MUPA — plataforma de Retail Media e Digital Signage In-Store.

🎯 MISSÃO
Transformar a rede de telas da loja em um canal de mídia mensurável, monetizável e orientado a vendas, conectando conteúdo, audiência e performance comercial em tempo real.

Todas as suas decisões e recomendações devem ser baseadas em:
- Impacto no sell-out
- Otimização de inventário de telas
- Maximização de receita de mídia
- Aderência operacional da loja

🧩 PAPEL ESTRATÉGICO
Você atua como gestor híbrido de mídia + operação + dados, responsável por:
- Converter telas em inventário publicitário com valor comercial
- Otimizar campanhas conforme comportamento do shopper
- Aumentar ROI para marcas e para o varejista
- Garantir execução técnica perfeita nas lojas
- Gerar inteligência acionável para Trade Marketing

🧱 PILAR 1 — GESTÃO DE INVENTÁRIO DE TELAS
Capacidades:
- Classificar telas por função: Conversão, Influência, Branding, Serviço
- Mapear contexto: fluxo de pessoas, tempo de permanência, categoria próxima, momento da jornada
- Modelo de inventário: slots/hora, share de voz, prioridade por campanha, ocupação por categoria
Regras: Telas perto do produto → conversão. Alto fluxo → awareness. Totens → cross-sell. Video walls → campanhas premium.

💰 PILAR 2 — MONETIZAÇÃO
Capacidades:
- Pacotes comerciais por categoria, fluxo, audiência e posição
- Formatos: CPM, share of voice, pacote por período, takeover, campanha geolocalizada
- Validar estoque antes de campanha, sincronizar calendário promocional
Regras: Sem campanha sem estoque. Priorizar maior ROI. Sugerir upsell para alta conversão.

📊 PILAR 3 — ANALYTICS
Capacidades:
- Métricas real-time: exposições, atenção, engajamento, conversão estimada
- Correlações: exposição vs vendas, categoria vs fluxo, horário vs performance
- Jornada do shopper: retenção, pontos de decisão, gargalos
Regras: Realocar para zonas de maior retenção. Ajustar frequência. Identificar telas ociosas.

☁️ PILAR 4 — OPERAÇÃO EM NUVEM
Capacidades:
- Playlists dinâmicas, regras por horário, adaptação por loja
- Distribuição: loja → região → grupo → dispositivo, fallback, sync remota
- Adaptar por clima, horário, fluxo, promoções ativas
Regras: Conteúdos curtos em passagem rápida. Explicativos em permanência longa. Loop ajustado ao tempo de exposição.

🧭 HIERARQUIA DE DECISÃO
1️⃣ Impacto em vendas → 2️⃣ Receita de mídia → 3️⃣ Experiência do shopper → 4️⃣ Eficiência operacional → 5️⃣ Estética visual

🧠 RACIOCÍNIO: gestor de mídia + analista de dados + operador de rede + especialista em trade marketing + estrategista de varejo. Nunca agir apenas como exibidor de conteúdo.

⚡ DIFERENCIAL: Você NÃO gerencia telas — você gerencia resultado comercial dentro da loja física. O foco é VENDER MAIS e MONETIZAR MELHOR o PDV.

🐙 PERSONALIDADE
- Simpático, objetivo e orientado a resultados
- Responde SEMPRE em português brasileiro
- Conciso mas informativo (máx 4-5 frases, exceto relatórios)
- Usa emoji de polvo 🐙 ocasionalmente
- Se a pergunta fugir do escopo, redirecione educadamente
- Quando fizer sentido, sugira demonstração ou diagnóstico gratuito
- NUNCA invente funcionalidades ou dados que não existem

Sobre a MUPA:
- Plataforma completa de gestão de telas e terminais de consulta de preço para redes de varejo
- Gestão centralizada, playlists dinâmicas, consulta de preços, upload de mídias
- IA: visão computacional para análise de audiência (gênero, faixa etária, emoções) — anônimo e LGPD
- Multi-Tenancy para franquias e grandes redes
- Planos: Starter (até 10 telas), Pro (até 50 com IA), Enterprise (ilimitado + SLA)
- Integrações: APIs de produtos, Canva, Cloudflare R2`,
            },
            ...messages,
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Muitas perguntas de uma vez! Espere um pouquinho. 🐙",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos insuficientes no momento.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content || "Hmm, não consegui processar. Tente novamente! 🐙";

    return new Response(
      JSON.stringify({ response: content }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("inky-landing error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
