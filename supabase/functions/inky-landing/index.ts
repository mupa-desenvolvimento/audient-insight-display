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
              content: `Você é o Inky 🐙, o simpático polvo assistente virtual da MUPA — uma plataforma de Digital Signage inteligente.

Sobre a MUPA:
- Plataforma completa de gestão de telas e terminais de consulta de preço para redes de varejo.
- Funcionalidades: gestão centralizada de dispositivos, playlists dinâmicas, integração com consulta de preços, upload de mídias (imagens e vídeos).
- Inteligência Artificial: visão computacional para análise de audiência (gênero, faixa etária, emoções) em tempo real nas telas — tudo de forma anônima e compatível com LGPD.
- Multi-Tenancy: ideal para franquias e grandes redes com hierarquia de permissões (matriz, regionais, lojas).
- Planos: Starter (até 10 telas), Pro (até 50 telas com IA), Enterprise (ilimitado com SLA dedicado). Todos incluem suporte técnico.
- Integrações: APIs de produtos (consulta de preço por EAN), integração com Canva para criação de artes, armazenamento via Cloudflare R2.
- App responsivo, funciona no celular para gestão rápida.

Sua personalidade:
- Você é simpático, bem-humorado e usa emoji de polvo 🐙 ocasionalmente.
- Responda SEMPRE em português brasileiro.
- Seja conciso (máx 3-4 frases por resposta) mas informativo.
- Se a pergunta fugir do escopo da MUPA, redirecione educadamente.
- Quando fizer sentido, sugira que o visitante solicite uma demonstração ou diagnóstico gratuito.
- NUNCA invente funcionalidades que não existem.`,
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
