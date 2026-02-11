import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface EnrichRequest {
  ean: string;
  product_name: string;
  product_data?: Record<string, unknown>;
}

interface EnrichResponse {
  success: boolean;
  enriched?: {
    description: string;
    category: string;
    tags: string[];
    suggestions?: string[];
  };
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[Enrich] LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ success: false, error: 'API key não configurada' } as EnrichResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json() as EnrichRequest;
    const { ean, product_name, product_data } = body;

    console.log('[Enrich] EAN:', ean, 'Name:', product_name);

    if (!ean || !product_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'EAN e nome do produto são obrigatórios' } as EnrichResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já foi enriquecido recentemente
    const { data: existing } = await supabase
      .from('product_lookup_analytics')
      .select('ai_description, ai_category, ai_tags, ai_enriched_at')
      .eq('ean', ean)
      .eq('ai_enriched', true)
      .order('ai_enriched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.ai_enriched_at) {
      const enrichedAt = new Date(existing.ai_enriched_at);
      const hoursSince = (Date.now() - enrichedAt.getTime()) / (1000 * 60 * 60);
      
      // Usar cache se foi enriquecido nas últimas 24 horas
      if (hoursSince < 24 && existing.ai_description) {
        console.log('[Enrich] Usando dados em cache para EAN:', ean);
        return new Response(
          JSON.stringify({
            success: true,
            enriched: {
              description: existing.ai_description,
              category: existing.ai_category || 'Geral',
              tags: existing.ai_tags || [],
            }
          } as EnrichResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Chamar Lovable AI para enriquecer o produto
    const prompt = `Você é um especialista em produtos de varejo, códigos de barras EAN/GTIN e categorização de produtos.

Dado o seguinte produto:
- Código EAN: ${ean}
- Nome: ${product_name}
${product_data ? `- Dados adicionais: ${JSON.stringify(product_data)}` : ''}

Analise e forneça:
1. Uma descrição detalhada do produto (2-3 frases)
2. A categoria principal do produto (ex: Alimentos, Bebidas, Limpeza, Higiene, etc.)
3. Tags relevantes para busca e análise (máximo 5 tags)

Responda APENAS no formato JSON:
{
  "description": "descrição aqui",
  "category": "categoria aqui",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    console.log('[Enrich] Chamando IA...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Enrich] Erro na IA:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente mais tarde.' } as EnrichResponse),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao consultar IA' } as EnrichResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('[Enrich] Resposta IA:', content.substring(0, 200));

    // Extrair JSON da resposta
    let enrichedData: { description: string; category: string; tags: string[] };
    
    try {
      // Tentar encontrar JSON na resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        enrichedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('[Enrich] Erro ao parsear resposta:', parseError);
      
      // Fallback: criar dados básicos
      enrichedData = {
        description: `${product_name} - Código EAN ${ean}`,
        category: 'Geral',
        tags: [product_name.split(' ')[0]?.toLowerCase() || 'produto']
      };
    }

    // Atualizar registros existentes com dados enriquecidos
    const { error: updateError } = await supabase
      .from('product_lookup_analytics')
      .update({
        ai_enriched: true,
        ai_description: enrichedData.description,
        ai_category: enrichedData.category,
        ai_tags: enrichedData.tags,
        ai_enriched_at: new Date().toISOString()
      })
      .eq('ean', ean)
      .eq('ai_enriched', false);

    if (updateError) {
      console.error('[Enrich] Erro ao atualizar analytics:', updateError);
    } else {
      console.log('[Enrich] Analytics atualizados para EAN:', ean);
    }

    return new Response(
      JSON.stringify({
        success: true,
        enriched: enrichedData
      } as EnrichResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[Enrich] Erro:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' } as EnrichResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
