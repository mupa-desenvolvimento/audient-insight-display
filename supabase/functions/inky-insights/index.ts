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
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "full-analysis";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Gather all system data
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      devicesResult,
      detectionsToday,
      detectionsWeek,
      mediaResult,
      playlistsResult,
      storesResult,
      productLookupsResult,
      productRecommendationsResult,
    ] = await Promise.all([
      supabaseClient.from("devices").select("id, name, status, is_active, store_code, last_seen_at, camera_enabled"),
      supabaseClient
        .from("device_detection_logs")
        .select("id, gender, age_group, emotion, attention_duration, content_name, device_nickname, detected_at")
        .gte("detected_at", todayStart)
        .lte("detected_at", todayEnd)
        .limit(1000),
      supabaseClient
        .from("device_detection_logs")
        .select("id, gender, age_group, emotion, attention_duration, content_name, detected_at")
        .gte("detected_at", weekAgo)
        .limit(1000),
      supabaseClient.from("media_items").select("id, name, type, status, duration"),
      supabaseClient.from("playlists").select("id, name, is_active, has_channels"),
      supabaseClient.from("stores").select("id, name, code, is_active"),
      supabaseClient
        .from("product_lookup_analytics")
        .select("id, ean, product_name, gender, age_group, emotion, lookup_count, store_code")
        .gte("created_at", weekAgo)
        .limit(500),
      supabaseClient
        .from("product_recommendations")
        .select("id, name, ean, category, target_gender, target_mood, target_age_min, target_age_max, score")
        .eq("is_active", true)
        .limit(100),
    ]);

    const devices = devicesResult.data || [];
    const todayDetections = detectionsToday.data || [];
    const weekDetections = detectionsWeek.data || [];
    const media = mediaResult.data || [];
    const playlists = playlistsResult.data || [];
    const stores = storesResult.data || [];
    const productLookups = productLookupsResult.data || [];
    const recommendations = productRecommendationsResult.data || [];

    // Build demographics summary
    const genderCount: Record<string, number> = {};
    const ageGroupCount: Record<string, number> = {};
    const emotionCount: Record<string, number> = {};
    let totalAttention = 0;
    let attentionCount = 0;
    const contentViews: Record<string, number> = {};
    const hourlyDistribution: Record<number, number> = {};

    todayDetections.forEach((d) => {
      if (d.gender) genderCount[d.gender] = (genderCount[d.gender] || 0) + 1;
      if (d.age_group) ageGroupCount[d.age_group] = (ageGroupCount[d.age_group] || 0) + 1;
      if (d.emotion) emotionCount[d.emotion] = (emotionCount[d.emotion] || 0) + 1;
      if (d.attention_duration) {
        totalAttention += d.attention_duration;
        attentionCount++;
      }
      if (d.content_name) contentViews[d.content_name] = (contentViews[d.content_name] || 0) + 1;
      if (d.detected_at) {
        const hour = new Date(d.detected_at).getHours();
        hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      }
    });

    // Product analytics summary
    const topProducts: Record<string, { name: string; count: number; genders: Record<string, number>; ages: Record<string, number> }> = {};
    productLookups.forEach((p) => {
      if (!topProducts[p.ean]) {
        topProducts[p.ean] = { name: p.product_name || p.ean, count: 0, genders: {}, ages: {} };
      }
      topProducts[p.ean].count += p.lookup_count || 1;
      if (p.gender) topProducts[p.ean].genders[p.gender] = (topProducts[p.ean].genders[p.gender] || 0) + 1;
      if (p.age_group) topProducts[p.ean].ages[p.age_group] = (topProducts[p.ean].ages[p.age_group] || 0) + 1;
    });

    const systemData = {
      overview: {
        total_devices: devices.length,
        online_devices: devices.filter((d) => d.status === "online").length,
        offline_devices: devices.filter((d) => d.status === "offline").length,
        total_stores: stores.length,
        active_stores: stores.filter((s) => s.is_active).length,
        total_media: media.length,
        active_playlists: playlists.filter((p) => p.is_active).length,
        cameras_enabled: devices.filter((d) => d.camera_enabled).length,
      },
      audience_today: {
        total_detections: todayDetections.length,
        gender_distribution: genderCount,
        age_distribution: ageGroupCount,
        emotion_distribution: emotionCount,
        avg_attention_seconds: attentionCount > 0 ? (totalAttention / attentionCount).toFixed(1) : "0",
        peak_hours: Object.entries(hourlyDistribution).sort(([, a], [, b]) => b - a).slice(0, 3),
        top_content: Object.entries(contentViews).sort(([, a], [, b]) => b - a).slice(0, 5),
      },
      audience_week: {
        total_detections: weekDetections.length,
      },
      product_insights: {
        total_lookups: productLookups.length,
        top_products: Object.values(topProducts).sort((a, b) => b.count - a.count).slice(0, 10),
        total_recommendations: recommendations.length,
        recommendation_categories: [...new Set(recommendations.map((r) => r.category).filter(Boolean))],
      },
    };

    // Build the prompt based on action
    let systemPrompt = "";
    if (action === "full-analysis") {
      systemPrompt = `Você é o Inky 🐙, o assistente de inteligência da plataforma MUPA Digital Signage.
Analise os dados do sistema e gere um relatório completo com insights acionáveis.

Organize sua resposta nas seguintes seções com emojis:

## 🎯 Visão Geral do Sistema
Resumo executivo do estado atual.

## 👥 Análise de Audiência
Análise detalhada do público: gênero, faixa etária, emoções predominantes, horários de pico.

## 🧠 Recomendações Inteligentes
Sugestões de cross-sell, produtos complementares baseados nos dados de consulta de preço.

## 🎥 Segmentação Dinâmica de Conteúdo
Sugestões de como segmentar o conteúdo baseado no perfil demográfico, emoções e horários.

## 📈 Dashboard de Trade Marketing
Análise de audiência por campanha/conteúdo, tempo de exposição, comparações.

## 💰 Monetização de Tela
Cálculo estimado de valor de exibição baseado em audiência real, horários e lojas.

## 🤖 Insights Automáticos
Padrões comportamentais identificados, anomalias, sugestões de melhoria.

Use dados reais fornecidos. Seja específico com números. Responda em português brasileiro.
Formate com markdown rico (tabelas, listas, negrito).`;
    } else if (action === "audience") {
      systemPrompt = `Você é o Inky 🐙. Analise APENAS os dados de audiência detalhadamente. Foque em: perfil demográfico, emoções, tendências, horários de pico, conteúdos mais engajantes. Use tabelas markdown. Português BR.`;
    } else if (action === "monetization") {
      systemPrompt = `Você é o Inky 🐙. Analise o potencial de monetização das telas. Calcule valores estimados de CPM com base na audiência real, horários premium, e valor por loja. Crie uma tabela de precificação sugerida. Português BR.`;
    } else if (action === "recommendations") {
      systemPrompt = `Você é o Inky 🐙. Analise os dados de consulta de produtos e recomendações. Sugira estratégias de cross-sell, personalização por perfil, e campanhas baseadas em dados demográficos. Português BR.`;
    } else if (action === "segmentation") {
      systemPrompt = `Você é o Inky 🐙. Crie regras de segmentação dinâmica de conteúdo baseadas nos dados de audiência. Sugira: qual mídia exibir para qual perfil, horário ideal para cada tipo de conteúdo, priorização de campanhas. Português BR.`;
    } else if (action === "trade-marketing") {
      systemPrompt = `Você é o Inky 🐙. Gere um relatório de Trade Marketing com: audiência por conteúdo, perfil demográfico por mídia exibida, tempo médio de exposição, comparação entre conteúdos. Use tabelas. Português BR.`;
    }

    const { question } = await req.json().catch(() => ({ question: "" }));

    const userContent = question
      ? `Dados do sistema: ${JSON.stringify(systemData)}\n\nPergunta específica: ${question}`
      : `Dados do sistema para análise: ${JSON.stringify(systemData)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("inky-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
