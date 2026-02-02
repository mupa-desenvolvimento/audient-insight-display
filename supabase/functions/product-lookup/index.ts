import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProductLookupRequest {
  device_code: string;
  ean: string;
}

interface ProductResponse {
  success: boolean;
  product?: {
    ean: string;
    name: string;
    unit: string;
    current_price: number;
    original_price: number | null;
    is_offer: boolean;
    savings_percent: number | null;
    image_url: string | null;
    store_code: string;
  };
  error?: string;
}

interface TokenCache {
  token: string;
  expires_at: string;
}

interface ZaffariLoginResponse {
  token?: string;
  access_token?: string;
  expires_in?: number;
}

interface ZaffariPriceItem {
  descricao?: string;
  nome?: string;
  name?: string;
  preco?: number;
  precoAtual?: number;
  price?: number;
  precoAnterior?: number;
  precoOriginal?: number;
  original_price?: number;
  unidade?: string;
  unit?: string;
  embalagem?: string;
  oferta?: boolean;
  isOffer?: boolean;
  is_offer?: boolean;
}

interface ZaffariPriceResponse {
  produtos?: ZaffariPriceItem[];
  items?: ZaffariPriceItem[];
  data?: ZaffariPriceItem[];
}

// Função para validar e normalizar EAN
function validateEan(ean: string): { valid: boolean; normalized: string; error?: string } {
  const trimmed = ean.trim();
  
  if (!trimmed) {
    return { valid: false, normalized: '', error: 'EAN não pode estar vazio' };
  }
  
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, normalized: '', error: 'EAN deve conter apenas números' };
  }
  
  const validLengths = [8, 12, 13, 14];
  if (!validLengths.includes(trimmed.length)) {
    return { valid: false, normalized: '', error: `EAN deve ter 8, 12, 13 ou 14 dígitos (recebido: ${trimmed.length})` };
  }
  
  return { valid: true, normalized: trimmed };
}

// Função para obter ou renovar token
async function getToken(
  supabase: ReturnType<typeof createClient>,
  companyIntegration: {
    id: string;
    credentials: Record<string, string>;
    settings: Record<string, unknown>;
    token_cache: TokenCache | null;
    integration: {
      base_url: string;
      endpoints: Record<string, { method: string; path: string }>;
      default_settings: Record<string, unknown>;
    };
  }
): Promise<{ token: string | null; error?: string }> {
  const now = new Date();
  
  // Verifica se o token em cache ainda é válido
  if (companyIntegration.token_cache?.token && companyIntegration.token_cache?.expires_at) {
    const expiresAt = new Date(companyIntegration.token_cache.expires_at);
    // Renova 5 minutos antes de expirar
    if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
      console.log('[Token] Usando token em cache');
      return { token: companyIntegration.token_cache.token };
    }
  }
  
  console.log('[Token] Obtendo novo token...');
  
  const credentials = companyIntegration.credentials;
  const baseUrl = companyIntegration.integration.base_url;
  const loginEndpoint = companyIntegration.integration.endpoints.login;
  
  if (!credentials.usuario || !credentials.password) {
    return { token: null, error: 'Credenciais não configuradas' };
  }
  
  try {
    const response = await fetch(`${baseUrl}${loginEndpoint.path}`, {
      method: loginEndpoint.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: credentials.usuario,
        password: credentials.password
      })
    });
    
    if (!response.ok) {
      console.error('[Token] Erro na autenticação:', response.status);
      return { token: null, error: `Erro na autenticação: ${response.status}` };
    }
    
    const data = await response.json() as ZaffariLoginResponse;
    const token = data.token || data.access_token;
    
    if (!token) {
      console.error('[Token] Token não encontrado na resposta');
      return { token: null, error: 'Token não encontrado na resposta' };
    }
    
    // Calcula expiração (padrão 60 minutos se não informado)
    const ttlMinutes = (companyIntegration.settings.token_ttl_minutes as number) || 
                       (companyIntegration.integration.default_settings.token_ttl_minutes as number) || 60;
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    
    // Atualiza cache no banco
    await supabase
      .from('company_integrations')
      .update({
        token_cache: { token, expires_at: expiresAt.toISOString() }
      })
      .eq('id', companyIntegration.id);
    
    console.log('[Token] Novo token obtido e armazenado');
    return { token };
  } catch (err) {
    console.error('[Token] Erro ao obter token:', err);
    return { token: null, error: 'Falha na conexão com servidor de autenticação' };
  }
}

// Função para consultar preço
async function fetchPrice(
  token: string,
  baseUrl: string,
  endpoint: { method: string; path: string },
  storeCode: string,
  ean: string
): Promise<{ data: ZaffariPriceItem | null; error?: string }> {
  try {
    const url = `${baseUrl}${endpoint.path}?loja=${encodeURIComponent(storeCode)}&ean=${encodeURIComponent(ean)}`;
    
    console.log('[Price] Consultando:', url);
    
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      return { data: null, error: 'TOKEN_EXPIRED' };
    }
    
    if (!response.ok) {
      console.error('[Price] Erro na consulta:', response.status);
      return { data: null, error: `Erro na consulta: ${response.status}` };
    }
    
    const responseData = await response.json() as ZaffariPriceResponse;
    
    // Tenta encontrar o produto nos diferentes formatos de resposta
    const items = responseData.produtos || responseData.items || responseData.data || [];
    
    if (!items || items.length === 0) {
      return { data: null, error: 'Produto não encontrado' };
    }
    
    return { data: items[0] };
  } catch (err) {
    console.error('[Price] Erro:', err);
    return { data: null, error: 'Falha na conexão com servidor de preços' };
  }
}

// Função para obter imagem do produto
async function fetchProductImage(imageBaseUrl: string, ean: string): Promise<string | null> {
  try {
    const url = `${imageBaseUrl}/${ean}`;
    console.log('[Image] Buscando imagem:', url);
    
    const response = await fetch(url, { method: 'GET' });
    
    if (!response.ok) {
      console.log('[Image] Imagem não encontrada:', response.status);
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    
    // Se retornar JSON com URL
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return data.url || data.image_url || data.imageUrl || null;
    }
    
    // Se retornar a própria imagem, retorna a URL
    if (contentType?.includes('image/')) {
      return url;
    }
    
    // Se retornar texto (URL)
    const text = await response.text();
    if (text.startsWith('http')) {
      return text.trim();
    }
    
    return url;
  } catch (err) {
    console.error('[Image] Erro:', err);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const body = await req.json() as ProductLookupRequest;
    const { device_code, ean } = body;
    
    // Validar entrada
    if (!device_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'device_code é obrigatório' } as ProductResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const eanValidation = validateEan(ean);
    if (!eanValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: eanValidation.error } as ProductResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const normalizedEan = eanValidation.normalized;
    
    // Buscar dispositivo e sua empresa
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, company_id, store_id')
      .eq('device_code', device_code)
      .single();
    
    if (deviceError || !device) {
      console.error('[Device] Não encontrado:', device_code);
      return new Response(
        JSON.stringify({ success: false, error: 'Dispositivo não encontrado' } as ProductResponse),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!device.company_id) {
      console.error('[Device] Sem empresa vinculada:', device_code);
      return new Response(
        JSON.stringify({ success: false, error: 'Dispositivo não vinculado a uma empresa' } as ProductResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Buscar integração ativa da empresa
    const { data: companyIntegration, error: integrationError } = await supabase
      .from('company_integrations')
      .select(`
        id,
        credentials,
        settings,
        token_cache,
        integration:api_integrations (
          id,
          name,
          base_url,
          endpoints,
          default_settings
        )
      `)
      .eq('company_id', device.company_id)
      .eq('is_active', true)
      .single();
    
    if (integrationError || !companyIntegration) {
      console.error('[Integration] Não encontrada para empresa:', device.company_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Integração não configurada para esta empresa' } as ProductResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const integration = Array.isArray(companyIntegration.integration) 
      ? companyIntegration.integration[0] 
      : companyIntegration.integration;
    
    if (!integration) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados de integração inválidos' } as ProductResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const storeCode = (companyIntegration.settings as Record<string, string>).loja || 
                      (companyIntegration.settings as Record<string, string>).store_code || 
                      '1';
    
    // Verificar cache
    const cacheTtl = (companyIntegration.settings as Record<string, number>).cache_ttl_minutes || 
                     (integration.default_settings as Record<string, number>).cache_ttl_minutes || 15;
    
    const { data: cached } = await supabase
      .from('product_cache')
      .select('product_data, image_url')
      .eq('company_id', device.company_id)
      .eq('ean', normalizedEan)
      .eq('store_code', storeCode)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (cached) {
      console.log('[Cache] Hit para EAN:', normalizedEan);
      
      // Registrar log
      await supabase.from('product_lookup_logs').insert({
        device_id: device.id,
        company_id: device.company_id,
        ean: normalizedEan,
        store_code: storeCode,
        status: 'success',
        latency_ms: Date.now() - startTime
      });
      
      const productData = cached.product_data as Record<string, unknown>;
      
      return new Response(
        JSON.stringify({
          success: true,
          product: {
            ean: normalizedEan,
            name: productData.name as string,
            unit: productData.unit as string,
            current_price: productData.current_price as number,
            original_price: productData.original_price as number | null,
            is_offer: productData.is_offer as boolean,
            savings_percent: productData.savings_percent as number | null,
            image_url: cached.image_url,
            store_code: storeCode
          }
        } as ProductResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Obter token
    let tokenResult = await getToken(supabase, {
      ...companyIntegration,
      integration: integration as typeof companyIntegration.integration,
      token_cache: companyIntegration.token_cache as TokenCache | null,
      credentials: companyIntegration.credentials as Record<string, string>,
      settings: companyIntegration.settings as Record<string, unknown>
    });
    
    if (!tokenResult.token) {
      await supabase.from('product_lookup_logs').insert({
        device_id: device.id,
        company_id: device.company_id,
        ean: normalizedEan,
        store_code: storeCode,
        status: 'error',
        latency_ms: Date.now() - startTime,
        error_message: tokenResult.error
      });
      
      return new Response(
        JSON.stringify({ success: false, error: tokenResult.error } as ProductResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Consultar preço
    let priceResult = await fetchPrice(
      tokenResult.token,
      integration.base_url,
      (integration.endpoints as Record<string, { method: string; path: string }>).price,
      storeCode,
      normalizedEan
    );
    
    // Se token expirou, renova e tenta novamente
    if (priceResult.error === 'TOKEN_EXPIRED') {
      console.log('[Price] Token expirado, renovando...');
      
      // Limpa cache do token
      await supabase
        .from('company_integrations')
        .update({ token_cache: {} })
        .eq('id', companyIntegration.id);
      
      tokenResult = await getToken(supabase, {
        ...companyIntegration,
        integration: integration as typeof companyIntegration.integration,
        token_cache: null,
        credentials: companyIntegration.credentials as Record<string, string>,
        settings: companyIntegration.settings as Record<string, unknown>
      });
      
      if (!tokenResult.token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Falha ao renovar token' } as ProductResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      priceResult = await fetchPrice(
        tokenResult.token,
        integration.base_url,
        (integration.endpoints as Record<string, { method: string; path: string }>).price,
        storeCode,
        normalizedEan
      );
    }
    
    if (!priceResult.data) {
      const status = priceResult.error === 'Produto não encontrado' ? 'not_found' : 'error';
      
      await supabase.from('product_lookup_logs').insert({
        device_id: device.id,
        company_id: device.company_id,
        ean: normalizedEan,
        store_code: storeCode,
        status,
        latency_ms: Date.now() - startTime,
        error_message: priceResult.error
      });
      
      return new Response(
        JSON.stringify({ success: false, error: priceResult.error } as ProductResponse),
        { status: status === 'not_found' ? 404 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Buscar imagem
    const imageBaseUrl = (companyIntegration.settings as Record<string, string>).image_base_url || 
                         (integration.default_settings as Record<string, string>).image_base_url;
    
    let imageUrl: string | null = null;
    if (imageBaseUrl) {
      imageUrl = await fetchProductImage(imageBaseUrl, normalizedEan);
    }
    
    // Normalizar dados do produto
    const priceData = priceResult.data;
    const currentPrice = priceData.preco || priceData.precoAtual || priceData.price || 0;
    const originalPrice = priceData.precoAnterior || priceData.precoOriginal || priceData.original_price || null;
    const isOffer = priceData.oferta || priceData.isOffer || priceData.is_offer || (originalPrice !== null && originalPrice > currentPrice);
    
    let savingsPercent: number | null = null;
    if (isOffer && originalPrice && originalPrice > currentPrice) {
      savingsPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }
    
    const productData = {
      name: priceData.descricao || priceData.nome || priceData.name || 'Produto',
      unit: priceData.unidade || priceData.unit || priceData.embalagem || 'UN',
      current_price: currentPrice,
      original_price: originalPrice,
      is_offer: isOffer,
      savings_percent: savingsPercent
    };
    
    // Salvar em cache
    const expiresAt = new Date(Date.now() + cacheTtl * 60 * 1000);
    
    await supabase
      .from('product_cache')
      .upsert({
        company_id: device.company_id,
        ean: normalizedEan,
        store_code: storeCode,
        product_data: productData,
        image_url: imageUrl,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'company_id,ean,store_code'
      });
    
    // Registrar log de sucesso
    await supabase.from('product_lookup_logs').insert({
      device_id: device.id,
      company_id: device.company_id,
      ean: normalizedEan,
      store_code: storeCode,
      status: 'success',
      latency_ms: Date.now() - startTime
    });
    
    console.log('[Success] Produto encontrado:', normalizedEan, 'em', Date.now() - startTime, 'ms');
    
    return new Response(
      JSON.stringify({
        success: true,
        product: {
          ean: normalizedEan,
          ...productData,
          image_url: imageUrl,
          store_code: storeCode
        }
      } as ProductResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (err) {
    console.error('[Error]', err);
    
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' } as ProductResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
