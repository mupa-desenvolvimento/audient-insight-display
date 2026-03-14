import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZenQuote {
  q: string;
  a: string;
}

interface UnsplashPhoto {
  urls: { regular: string; small: string };
  user: { name: string };
  id: string;
}

const UNSPLASH_QUERIES = [
  "inspirational nature landscape",
  "sunrise mountain",
  "ocean calm peaceful",
  "forest light rays",
  "starry night sky",
  "flower bloom macro",
  "waterfall tropical",
  "desert sunset golden",
  "autumn leaves colorful",
  "northern lights aurora",
  "zen garden peaceful",
  "misty mountains morning",
  "lavender field purple",
  "cherry blossom spring",
  "lake reflection mirror",
];

async function fetchZenQuotes(): Promise<ZenQuote[]> {
  try {
    const res = await fetch("https://zenquotes.io/api/quotes");
    if (!res.ok) throw new Error(`ZenQuotes API returned ${res.status}`);
    const data = await res.json();
    // Filter out the "Too many requests" placeholder
    return (data || []).filter(
      (q: ZenQuote) => q.q && q.a && !q.q.includes("Too many requests")
    );
  } catch (e) {
    console.error("[seed-motivational] ZenQuotes fetch error:", e);
    return [];
  }
}

async function fetchUnsplashImages(
  query: string,
  perPage: number = 10
): Promise<string[]> {
  const PEXELS_KEY = Deno.env.get("PEXELS_API_KEY");

  // Try Pexels first (more reliable, already configured)
  if (PEXELS_KEY) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
        { headers: { Authorization: PEXELS_KEY } }
      );
      if (res.ok) {
        const data = await res.json();
        return (data.photos || []).map((p: any) => p.src.landscape || p.src.large);
      }
    } catch (e) {
      console.error("[seed-motivational] Pexels error:", e);
    }
  }

  // Fallback: use Unsplash source (no key needed, lower quality)
  const urls: string[] = [];
  for (let i = 0; i < perPage; i++) {
    urls.push(
      `https://source.unsplash.com/1920x1080/?${encodeURIComponent(query)}&sig=${Date.now()}_${i}`
    );
  }
  return urls;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc("is_tenant_admin", {
      check_user_id: user.id,
    });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Permissão negada" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant_id
    const { data: tenantId } = await adminClient.rpc("get_user_tenant_id_strict", {
      check_user_id: user.id,
    });

    // Parse request body
    let count = 30;
    try {
      const body = await req.json();
      if (body.count) count = Math.min(Math.max(body.count, 5), 50);
    } catch {
      // use defaults
    }

    console.log(`[seed-motivational] Fetching ${count} quotes for tenant ${tenantId}`);

    // Fetch quotes from ZenQuotes
    const quotes = await fetchZenQuotes();
    if (quotes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Não foi possível obter frases da ZenQuotes API" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch background images
    const queryIdx = Math.floor(Math.random() * UNSPLASH_QUERIES.length);
    const selectedQueries = [];
    for (let i = 0; i < 3; i++) {
      selectedQueries.push(UNSPLASH_QUERIES[(queryIdx + i) % UNSPLASH_QUERIES.length]);
    }

    let allImages: string[] = [];
    for (const q of selectedQueries) {
      const imgs = await fetchUnsplashImages(q, 15);
      allImages = allImages.concat(imgs);
    }

    // Check existing quotes to avoid duplicates
    const { data: existing } = await adminClient
      .from("motivational_quotes")
      .select("quote")
      .eq("tenant_id", tenantId || "");

    const existingSet = new Set((existing || []).map((e: any) => e.quote));

    // Combine quotes with images
    const newQuotes = quotes
      .filter((q) => !existingSet.has(q.q))
      .slice(0, count);

    if (newQuotes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Todas as frases já existem no banco",
          inserted: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const records = newQuotes.map((q, i) => ({
      tenant_id: tenantId,
      quote: q.q,
      author: q.a,
      image_url: allImages[i % allImages.length] || null,
      image_orientation: "landscape",
      source: "zenquotes",
      is_active: true,
      used: false,
    }));

    // Insert in batches
    let inserted = 0;
    const BATCH = 20;
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const { data, error } = await adminClient
        .from("motivational_quotes")
        .upsert(batch, { onConflict: "tenant_id,md5(quote)", ignoreDuplicates: true })
        .select("id");

      if (error) {
        console.error("[seed-motivational] Insert error:", error.message);
      } else {
        inserted += (data || []).length;
      }
    }

    console.log(`[seed-motivational] Inserted ${inserted} new quotes`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${inserted} frases motivacionais geradas com sucesso`,
        inserted,
        total_fetched: quotes.length,
        duplicates_skipped: quotes.length - newQuotes.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[seed-motivational] Fatal error:", msg);
    return new Response(
      JSON.stringify({ error: "Erro interno ao gerar frases" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
