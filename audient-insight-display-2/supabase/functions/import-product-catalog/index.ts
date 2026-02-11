import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MUPA_API_BASE = "http://srv-mupa.ddns.net:5050";
const BATCH_SIZE = 20; // produtos por lote para IA

interface MupaProduct {
  ean?: string;
  gtin?: string;
  codigo_barras?: string;
  descricao?: string;
  nome?: string;
  name?: string;
  description?: string;
  categoria?: string;
  category?: string;
  preco?: number;
  price?: number;
  [key: string]: unknown;
}

function getEan(product: MupaProduct): string | null {
  return product.ean || product.gtin || product.codigo_barras || null;
}

interface AICategorization {
  target_gender: string;
  target_age_min: number;
  target_age_max: number;
  target_mood: string;
  category: string;
  tags: string[];
  score: number;
}

async function fetchAllProducts(token: string): Promise<MupaProduct[]> {
  console.log("[import-catalog] Fetching products from Mupa API...");

  const response = await fetch(`${MUPA_API_BASE}/api/products?skip=0&limit=2000`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[import-catalog] Mupa API error:", response.status, text);
    throw new Error(`Mupa API returned ${response.status}: ${text}`);
  }

  const data = await response.json();
  const products = Array.isArray(data) ? data : data.products || data.items || data.data || [];
  console.log(`[import-catalog] Fetched ${products.length} products`);
  return products;
}

async function getProductImageUrl(ean: string): Promise<string | null> {
  try {
    const response = await fetch(`${MUPA_API_BASE}/produto-imagem/${ean}`);
    if (!response.ok) {
      await response.text();
      return null;
    }
    const data = await response.json();
    return data.imagem_url || data.image_url || null;
  } catch (e) {
    console.error(`[import-catalog] Error fetching image for ${ean}:`, e);
    return null;
  }
}

async function categorizeWithAI(products: MupaProduct[]): Promise<AICategorization[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const productList = products.map((p, i) => {
    const ean = getEan(p) || "unknown";
    const name = p.nome || p.name || p.descricao || p.description || `Product ${ean}`;
    const category = p.categoria || p.category || "";
    return `${i + 1}. EAN: ${ean} | Nome: ${name} | Categoria: ${category}`;
  }).join("\n");

  const systemPrompt = `Você é um especialista em marketing e comportamento do consumidor no varejo brasileiro. 
Analise cada produto e determine o perfil demográfico ideal do consumidor.

Para cada produto, retorne um JSON com:
- target_gender: "male", "female" ou "all"
- target_age_min: idade mínima (0-100)
- target_age_max: idade máxima (0-100)  
- target_mood: "happy", "sad", "neutral", "angry", "surprised" ou "all"
- category: categoria do produto em português (ex: "Bebidas", "Higiene", "Alimentos", "Limpeza", "Eletrônicos")
- tags: array de 3-5 tags descritivas em português
- score: relevância geral de 1-100 (quão popular/interessante é o produto)

Regras:
- Produtos infantis: age_min=0, age_max=12
- Produtos de beleza feminina: target_gender="female"
- Cervejas/bebidas alcoólicas: age_min=18, target_mood="happy"
- Produtos de limpeza: target_gender="all", target_mood="all"
- Doces/chocolates: target_mood="happy" ou "sad" (comfort food)
- Se não souber, use "all" para gender e mood`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Categorize estes ${products.length} produtos. Retorne APENAS um array JSON válido com ${products.length} objetos, na mesma ordem:\n\n${productList}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "categorize_products",
            description: "Categorize products by demographic profile",
            parameters: {
              type: "object",
              properties: {
                categorizations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      target_gender: { type: "string", enum: ["male", "female", "all"] },
                      target_age_min: { type: "integer" },
                      target_age_max: { type: "integer" },
                      target_mood: { type: "string", enum: ["happy", "sad", "neutral", "angry", "surprised", "all"] },
                      category: { type: "string" },
                      tags: { type: "array", items: { type: "string" } },
                      score: { type: "integer" },
                    },
                    required: ["target_gender", "target_age_min", "target_age_max", "target_mood", "category", "tags", "score"],
                  },
                },
              },
              required: ["categorizations"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "categorize_products" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[import-catalog] AI error:", response.status, text);
    throw new Error(`AI categorization failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    console.error("[import-catalog] No tool call in AI response");
    throw new Error("AI did not return structured data");
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.categorizations || [];
}

async function processAllProducts(supabase: any, products: MupaProduct[]) {
  console.log(`[import-catalog] Background: Processing ${products.length} products in batches of ${BATCH_SIZE}`);

  let totalInserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const rawBatch = products.slice(i, i + BATCH_SIZE);
    const batch = rawBatch.filter(p => getEan(p));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    if (batch.length === 0) { console.log(`[import-catalog] Batch ${batchNum} skipped (no EANs)`); continue; }
    console.log(`[import-catalog] Processing batch ${batchNum}/${Math.ceil(products.length / BATCH_SIZE)} (${batch.length} products)...`);

    try {
      const categorizations = await categorizeWithAI(batch);

      const records = await Promise.all(
        batch.map(async (product, idx) => {
          const cat = categorizations[idx] || {
            target_gender: "all", target_age_min: 0, target_age_max: 100,
            target_mood: "all", category: "Geral", tags: [], score: 50,
          };
          const ean = getEan(product);
          if (!ean) return null;
          const imageUrl = await getProductImageUrl(ean);
          const name = product.nome || product.name || product.descricao || product.description || `Produto ${ean}`;
          return {
            ean, name, description: cat.category, category: cat.category, tags: cat.tags,
            image_url: imageUrl, target_gender: cat.target_gender,
            target_age_min: cat.target_age_min, target_age_max: cat.target_age_max,
            target_mood: cat.target_mood, score: cat.score, source_data: product, is_active: true,
          };
        })
      );

      const validRecords = records.filter(Boolean);
      const { error: dbError } = await supabase
        .from("product_recommendations")
        .upsert(validRecords, { onConflict: "ean" });

      if (dbError) {
        console.error(`[import-catalog] DB error batch ${batchNum}:`, dbError);
        totalErrors += batch.length;
      } else {
        totalInserted += validRecords.length;
        console.log(`[import-catalog] Batch ${batchNum} inserted ${validRecords.length} products`);
      }
    } catch (batchError) {
      const msg = batchError instanceof Error ? batchError.message : String(batchError);
      console.error(`[import-catalog] Batch ${batchNum} failed:`, msg);
      totalErrors += batch.length;
    }

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < products.length) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log(`[import-catalog] COMPLETE! Inserted: ${totalInserted}, Errors: ${totalErrors}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MUPA_TOKEN = Deno.env.get("MUPA_API_TOKEN");
    if (!MUPA_TOKEN) {
      return new Response(JSON.stringify({ success: false, error: "MUPA_API_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all products first
    const products = await fetchAllProducts(MUPA_TOKEN);
    if (products.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No products found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validProducts = products.filter(p => getEan(p));
    console.log(`[import-catalog] ${validProducts.length}/${products.length} products have EAN`);

    // Run processing in background
    EdgeRuntime.waitUntil(processAllProducts(supabase, validProducts));

    // Return immediately
    return new Response(
      JSON.stringify({
        success: true,
        message: `Importação iniciada em background. ${validProducts.length} produtos sendo processados.`,
        total_products: products.length,
        valid_products: validProducts.length,
        estimated_batches: Math.ceil(validProducts.length / BATCH_SIZE),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[import-catalog] Fatal error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
