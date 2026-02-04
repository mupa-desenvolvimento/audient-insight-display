import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProductLookupRequest {
  device_code: string;
  ean: string;
  // Dados demográficos opcionais (via detecção facial)
  demographics?: {
    gender?: string;
    age_group?: string;
    age_estimate?: number;
    emotion?: string;
    emotion_confidence?: number;
  };
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

// Zaffari API constants
const ZAFFARI_BASE_URL = 'https://zaffariexpress.com.br';
const ZAFFARI_LOGIN_URL = `${ZAFFARI_BASE_URL}/api/login/login`;
const ZAFFARI_PRICE_URL = `${ZAFFARI_BASE_URL}/api/v1/consultapreco/precos`;

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

// Função para obter novo token da Zaffari
async function getZaffariToken(
  supabase: ReturnType<typeof createClient>,
  integrationId: string,
  credentials: { usuario: string; password: string },
  currentCache: TokenCache | null
): Promise<{ token: string | null; error?: string }> {
  const now = new Date();
  
  // Verifica se o token em cache ainda é válido (com margem de 5 minutos)
  if (currentCache?.token && currentCache?.expires_at) {
    const expiresAt = new Date(currentCache.expires_at);
    if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
      console.log('[Token] Usando token em cache');
      return { token: currentCache.token };
    }
  }
  
  console.log('[Token] Obtendo novo token da Zaffari...');
  
  if (!credentials.usuario || !credentials.password) {
    console.error('[Token] Credenciais não configuradas');
    return { token: null, error: 'Credenciais não configuradas' };
  }
  
  try {
    console.log('[Token] POST', ZAFFARI_LOGIN_URL);
    
    const response = await fetch(ZAFFARI_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: credentials.usuario,
        password: credentials.password
      })
    });
    
    console.log('[Token] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Token] Erro na autenticação:', response.status, errorText);
      return { token: null, error: `Erro na autenticação: ${response.status}` };
    }
    
    const data = await response.json();
    console.log('[Token] Response data keys:', Object.keys(data));
    
    // A API Zaffari pode retornar o token em diferentes campos
    const token = data.token || data.access_token || data.accessToken || data.Token;
    
    if (!token) {
      console.error('[Token] Token não encontrado na resposta:', JSON.stringify(data));
      return { token: null, error: 'Token não encontrado na resposta' };
    }
    
    // Calcula expiração (60 minutos padrão)
    const ttlMinutes = 60;
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    
    // Atualiza cache no banco
    const { error: updateError } = await supabase
      .from('company_integrations')
      .update({
        token_cache: { token, expires_at: expiresAt.toISOString() }
      })
      .eq('id', integrationId);
    
    if (updateError) {
      console.error('[Token] Erro ao salvar cache:', updateError);
    } else {
      console.log('[Token] Novo token obtido e armazenado');
    }
    
    return { token };
  } catch (err) {
    console.error('[Token] Erro ao obter token:', err);
    return { token: null, error: 'Falha na conexão com servidor de autenticação' };
  }
}

// Função para consultar preço na Zaffari
async function fetchZaffariPrice(
  token: string,
  storeCode: string,
  ean: string
): Promise<{ data: Record<string, unknown> | null; error?: string; tokenExpired?: boolean }> {
  const url = `${ZAFFARI_PRICE_URL}?loja=${encodeURIComponent(storeCode)}&ean=${encodeURIComponent(ean)}`;
  
  console.log('[Price] GET', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[Price] Response status:', response.status);
    
    if (response.status === 401 || response.status === 403) {
      console.log('[Price] Token expirado ou inválido');
      return { data: null, error: 'TOKEN_EXPIRED', tokenExpired: true };
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Price] Erro na consulta:', response.status, errorText);
      return { data: null, error: `Erro na consulta: ${response.status}` };
    }
    
    const responseText = await response.text();
    console.log('[Price] Response text (first 500 chars):', responseText.substring(0, 500));
    
    if (!responseText || responseText.trim() === '') {
      console.error('[Price] Resposta vazia');
      return { data: null, error: 'Resposta vazia do servidor' };
    }
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Price] Erro ao parsear JSON:', parseError);
      return { data: null, error: 'Resposta inválida do servidor' };
    }
    
    console.log('[Price] Response data type:', typeof responseData);
    console.log('[Price] Response data keys:', Object.keys(responseData || {}));
    
    // A API pode retornar um array direto ou um objeto com array
    let items: Record<string, unknown>[] = [];
    
    if (Array.isArray(responseData)) {
      items = responseData;
    } else if (responseData.produtos) {
      items = responseData.produtos;
    } else if (responseData.items) {
      items = responseData.items;
    } else if (responseData.data) {
      items = Array.isArray(responseData.data) ? responseData.data : [responseData.data];
    } else if (responseData.ean || responseData.preco || responseData.descricao) {
      // Resposta é o próprio produto
      items = [responseData];
    }
    
    console.log('[Price] Items count:', items.length);
    
    if (items.length === 0) {
      return { data: null, error: 'Produto não encontrado' };
    }
    
    console.log('[Price] First item:', JSON.stringify(items[0]));
    return { data: items[0] };
  } catch (err) {
    console.error('[Price] Erro:', err);
    return { data: null, error: 'Falha na conexão com servidor de preços' };
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
    const { device_code, ean, demographics } = body;
    
    console.log('[Request] device_code:', device_code, 'ean:', ean, 'demographics:', demographics);
    
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
      .select('id, company_id, store_id, store_code')
      .eq('device_code', device_code)
      .single();
    
    if (deviceError || !device) {
      console.error('[Device] Não encontrado:', device_code, deviceError);
      return new Response(
        JSON.stringify({ success: false, error: 'Dispositivo não encontrado' } as ProductResponse),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[Device] Encontrado:', device.id, 'company:', device.company_id, 'store_code:', device.store_code);
    
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
      .select('id, credentials, settings, token_cache')
      .eq('company_id', device.company_id)
      .eq('is_active', true)
      .single();
    
    if (integrationError || !companyIntegration) {
      console.error('[Integration] Não encontrada para empresa:', device.company_id, integrationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Integração não configurada para esta empresa' } as ProductResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[Integration] Encontrada:', companyIntegration.id);
    
    // Código da loja vem do dispositivo
    const storeCode = device.store_code || '1';
    console.log('[Lookup] store_code:', storeCode);
    
    const credentials = companyIntegration.credentials as { usuario: string; password: string };
    const tokenCache = companyIntegration.token_cache as TokenCache | null;
    
    // Verificar cache de produto primeiro
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
    let tokenResult = await getZaffariToken(
      supabase,
      companyIntegration.id,
      credentials,
      tokenCache
    );
    
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
    let priceResult = await fetchZaffariPrice(tokenResult.token, storeCode, normalizedEan);
    
    // Se token expirou, renova e tenta novamente
    if (priceResult.tokenExpired) {
      console.log('[Retry] Token expirado, renovando...');
      
      // Limpa cache do token
      await supabase
        .from('company_integrations')
        .update({ token_cache: {} })
        .eq('id', companyIntegration.id);
      
      tokenResult = await getZaffariToken(
        supabase,
        companyIntegration.id,
        credentials,
        null
      );
      
      if (!tokenResult.token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Falha ao renovar token' } as ProductResponse),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      priceResult = await fetchZaffariPrice(tokenResult.token, storeCode, normalizedEan);
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
    
    // Normalizar dados do produto Zaffari
    // Campos da API: descricao_produto, preco_base, embalagem_venda, link_imagem, etc.
    const priceData = priceResult.data;
    
    // Parsear preço (vem como string "8.99")
    const priceStr = priceData.preco_base || priceData.preco_prop_sellprice || priceData.preco || priceData.precoAtual || priceData.price || '0';
    const currentPrice = typeof priceStr === 'string' ? parseFloat(priceStr) || 0 : (priceStr as number);
    
    // Preço original para ofertas
    const originalPriceStr = priceData.preco_anterior || priceData.precoAnterior || priceData.precoOriginal || priceData.original_price || null;
    const originalPrice = originalPriceStr ? (typeof originalPriceStr === 'string' ? parseFloat(originalPriceStr) || null : (originalPriceStr as number)) : null;
    
    const isOffer = !!(priceData.oferta || priceData.isOffer || priceData.is_offer || (originalPrice !== null && originalPrice > currentPrice));
    
    let savingsPercent: number | null = null;
    if (isOffer && originalPrice && originalPrice > currentPrice) {
      savingsPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }
    
    // Nome do produto
    const name = (priceData.descricao_produto || priceData.descricao || priceData.nome || priceData.name || 'Produto') as string;
    
    // Unidade
    const unit = (priceData.embalagem_venda || priceData.unidade || priceData.unit || priceData.embalagem || 'UN') as string;
    
    // Imagem
    const imageUrl = (priceData.link_imagem || priceData.imagem || priceData.image_url || null) as string | null;
    
    const productData = {
      name,
      unit,
      current_price: currentPrice,
      original_price: originalPrice,
      is_offer: isOffer,
      savings_percent: savingsPercent
    };
    
    console.log('[Product] Normalizado:', JSON.stringify(productData), 'image:', imageUrl);
    
    // Salvar em cache (15 minutos)
    const cacheTtl = 15;
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
    
    // Registrar analytics com dados demográficos
    const analyticsData = {
      device_id: device.id,
      company_id: device.company_id,
      store_code: storeCode,
      ean: normalizedEan,
      product_name: productData.name,
      product_data: productData,
      gender: demographics?.gender || null,
      age_group: demographics?.age_group || null,
      age_estimate: demographics?.age_estimate || null,
      emotion: demographics?.emotion || null,
      emotion_confidence: demographics?.emotion_confidence || null,
      lookup_date: new Date().toISOString().split('T')[0],
    };
    
    console.log('[Analytics] Registrando:', JSON.stringify(analyticsData));
    
    const { error: analyticsError } = await supabase
      .from('product_lookup_analytics')
      .insert(analyticsData);
    
    if (analyticsError) {
      console.error('[Analytics] Erro ao registrar:', analyticsError);
    }
    
    console.log('[Success] Produto encontrado em', Date.now() - startTime, 'ms');
    
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
    console.error('[Error] Exceção não tratada:', err);
    
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' } as ProductResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
