import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const { messages, mode = "strategic" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch real system data for context
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      devicesResult,
      detectionsToday,
      mediaResult,
      playlistsResult,
      storesResult,
      productLookupsResult,
      groupsResult,
      channelsResult,
    ] = await Promise.all([
      supabaseClient.from("devices").select("id, name, status, is_active, store_id, store_code, last_seen_at, camera_enabled, current_playlist_id, resolution, device_code, group_id"),
      supabaseClient
        .from("device_detection_logs")
        .select("id, gender, age_group, emotion, attention_duration, content_name, device_nickname, detected_at")
        .gte("detected_at", todayStart)
        .limit(500),
      supabaseClient.from("media_items").select("id, name, type, status, duration"),
      supabaseClient.from("playlists").select("id, name, is_active, has_channels"),
      supabaseClient.from("stores").select("id, name, code, is_active, address, city_id"),
      supabaseClient
        .from("product_lookup_analytics")
        .select("id, ean, product_name, lookup_count, store_code")
        .gte("created_at", weekAgo)
        .limit(200),
      supabaseClient.from("device_groups").select("id, name, description, store_id"),
      supabaseClient.from("distribution_channels").select("id, name, type, is_active"),
    ]);

    const devices = devicesResult.data || [];
    const detections = detectionsToday.data || [];
    const media = mediaResult.data || [];
    const playlists = playlistsResult.data || [];
    const stores = storesResult.data || [];
    const lookups = productLookupsResult.data || [];
    const groups = groupsResult.data || [];
    const channels = channelsResult.data || [];

    // Build concise context
    const offlineDevices = devices.filter(d => d.status === "offline" && d.is_active);
    const devicesWithoutPlaylist = devices.filter(d => d.is_active && !d.current_playlist_id);
    const devicesWithoutStore = devices.filter(d => d.is_active && !d.store_id);

    const systemContext = `
DADOS REAIS DO SISTEMA (atualizado agora):
- ${devices.length} dispositivos cadastrados (${devices.filter(d => d.status === "online").length} online, ${offlineDevices.length} offline)
- ${stores.length} lojas (${stores.filter(s => s.is_active).length} ativas)
- ${media.length} mídias cadastradas
- ${playlists.length} playlists (${playlists.filter(p => p.is_active).length} ativas)
- ${groups.length} grupos de dispositivos
- ${channels.length} canais de distribuição
- ${detections.length} detecções de audiência hoje
- ${lookups.length} consultas de produto na última semana
- Dispositivos com câmera IA: ${devices.filter(d => d.camera_enabled).length}

ALERTAS AUTOMÁTICOS:
${offlineDevices.length > 0 ? `⚠️ ${offlineDevices.length} dispositivo(s) offline: ${offlineDevices.map(d => d.name).join(", ")}` : "✅ Todos os dispositivos online"}
${devicesWithoutPlaylist.length > 0 ? `⚠️ ${devicesWithoutPlaylist.length} dispositivo(s) sem playlist: ${devicesWithoutPlaylist.map(d => d.name).join(", ")}` : ""}
${devicesWithoutStore.length > 0 ? `⚠️ ${devicesWithoutStore.length} dispositivo(s) sem loja vinculada: ${devicesWithoutStore.map(d => d.name).join(", ")}` : ""}

DISPOSITIVOS:
${devices.map(d => `- "${d.name}" (${d.device_code}) | status: ${d.status} | loja: ${d.store_code || "sem loja"} | playlist: ${d.current_playlist_id ? "sim" : "não"} | câmera: ${d.camera_enabled ? "sim" : "não"} | resolução: ${d.resolution || "padrão"}`).join("\n")}

LOJAS:
${stores.map(s => `- "${s.name}" (código: ${s.code}) | ativa: ${s.is_active}`).join("\n")}

PLAYLISTS:
${playlists.map(p => `- "${p.name}" | ativa: ${p.is_active} | com canais: ${p.has_channels}`).join("\n")}

MÍDIAS (resumo):
- Total: ${media.length} | Tipos: ${[...new Set(media.map(m => m.type))].join(", ")}

GRUPOS:
${groups.map(g => `- "${g.name}": ${g.description || "sem descrição"}`).join("\n")}
`;

    const modeInstructions: Record<string, string> = {
      strategic: `\n🎯 MODO: ESTRATÉGICO — Foco em monetização, ROI e receita de mídia.`,
      operational: `\n⚙️ MODO: OPERACIONAL — Foco em status, saúde da rede e distribuição.`,
      analytics: `\n📊 MODO: ANALYTICS — Foco em métricas, audiência e insights de dados.`,
    };

    const systemPrompt = `Você é o Inky 🐙, assistente inteligente da plataforma MUPA de Digital Signage e Retail Media.

🧠 COMPORTAMENTO PRINCIPAL — INTELIGÊNCIA CONVERSACIONAL:
Você NÃO é um chatbot genérico. Você é um CONSULTOR ESPECIALISTA que constrói entendimento progressivo do que o usuário precisa.

REGRAS DE OURO:
1. **SEMPRE faça perguntas de acompanhamento** antes de executar ou responder algo complexo. Você precisa entender o contexto completo.
2. **Quando o usuário pedir algo**, não diga apenas "Entendido". Confirme o que entendeu e pergunte detalhes que faltam.
3. **Construa contexto**: A cada mensagem do usuário, você aprende mais sobre a operação dele. Use esse contexto acumulado nas respostas seguintes.
4. **Seja proativo**: Identifique problemas nos dados do sistema e AVISE o usuário sem ele precisar perguntar.
5. **Sugira ações**: Quando identificar uma oportunidade ou problema, sugira uma ação concreta.

FLUXO DE CONVERSA IDEAL:
- Usuário diz algo vago → Você faz 2-3 perguntas específicas para entender
- Usuário dá mais detalhes → Você confirma o entendimento e propõe a solução
- Usuário confirma → Você executa/orienta com base nos dados reais do sistema
- Ao final → Você sugere próximos passos ou alerta sobre algo relacionado

EXEMPLOS DE PERGUNTAS INTELIGENTES:
- "Entendi que você quer criar dispositivos na loja X. Me conta: quantos terminais serão? Qual o tipo de conteúdo (consulta de preço, mídia, ou ambos)?"
- "Vi que a playlist 'Y' está ativa. Quer que eu verifique quais dispositivos estão usando ela?"
- "Notei que o dispositivo Z está offline há 2 horas. Quer que eu analise o que pode ter acontecido?"
- "Antes de criar a configuração, me confirma: esses dispositivos vão ter câmera de IA ativada?"

ALERTAS PROATIVOS (sempre que relevante, insira no início da resposta):
- Dispositivos offline → Alerte imediatamente
- Dispositivos sem playlist → Sugira vincular
- Lojas sem dispositivos → Mencione
- Padrões anormais de audiência → Destaque

PERSONALIDADE:
- Simpático, objetivo e orientado a resultados
- SEMPRE em português brasileiro
- Conciso (3-5 frases normalmente, mais se for relatório)
- Use 🐙 ocasionalmente
- Formatação markdown quando enriquecer a resposta
- Nunca invente dados — use APENAS os dados reais fornecidos abaixo

${systemContext}
${modeInstructions[mode] || modeInstructions["strategic"]}`;

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
            { role: "system", content: systemPrompt },
            ...messages,
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas perguntas! Espere um pouquinho. 🐙" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content || "Hmm, não consegui processar. Tente novamente! 🐙";

    return new Response(
      JSON.stringify({ response: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("inky-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
