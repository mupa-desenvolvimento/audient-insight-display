// @ts-expect-error Remote ESM import for Deno edge function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const url = new URL(req.url)
  const path = url.pathname.split('/').pop() // Get last segment

  try {
    // 1. Validate Company
    if (path === 'validate-company' && req.method === 'POST') {
      const { cod_user } = await req.json()
      
      const { data: company, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('code', cod_user)
        .eq('is_active', true)
        .single()

      if (error || !company) {
        return new Response(
          JSON.stringify({ error: 'Empresa não encontrada ou inativa' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ company_id: company.id, company_name: company.name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1b. List Stores
    if (path === 'stores' && req.method === 'GET') {
        const company_id = url.searchParams.get('company_id')
        if (!company_id) throw new Error('company_id required')

        // Assuming company_id links to tenant_id or direct relationship. 
        // Need to check schema. Often stores have tenant_id. 
        // Let's assume we filter by tenant_id of the company if that's the link, 
        // OR we need to find the company first. 
        // Based on previous code: fetchStores used tenant_id.
        // Let's get the company's tenant_id first.
        const { data: company } = await supabase.from('companies').select('tenant_id').eq('id', company_id).single()
        
        const { data: stores, error } = await supabase
            .from('stores')
            .select('id, name, code')
            .eq('tenant_id', company?.tenant_id) // Or use company_id if column exists
            .eq('is_active', true)
            .order('name')
        
        if (error) throw error
        return new Response(JSON.stringify(stores), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1c. List Groups
    if (path === 'groups' && req.method === 'GET') {
        const store_id = url.searchParams.get('store_id')
        if (!store_id) throw new Error('store_id required')

        const { data: groups, error } = await supabase
            .from('device_groups')
            .select('id, name, type:screen_type') // Mapping screen_type to type
            .or(`store_id.eq.${store_id},store_id.is.null`)
            .order('name')

        if (error) throw error
        return new Response(JSON.stringify(groups), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Register Device
    if (path === 'register' && req.method === 'POST') {
      const { company_id, store_id, group_id, device_serial, device_name } = await req.json()

      // A. Get Region via Store -> City -> State -> Region
      // Note: This assumes the full chain exists. If simplified schema used, might be direct.
      // Based on types.ts: stores -> cities -> states -> regions
      const { data: storeData } = await supabase
        .from('stores')
        .select(`
          city:cities (
            state:states (
              region_id
            )
          )
        `)
        .eq('id', store_id)
        .single()

      // Safe navigation for region_id
      const region_id = storeData?.city?.state?.region_id || null

      // B. Get Channel via Group
      const { data: groupData } = await supabase
        .from('device_groups')
        .select('channel_id')
        .eq('id', group_id)
        .single()
      
      const channel_id = groupData?.channel_id || null

      // C. Generate Token
      const device_token = crypto.randomUUID()
      const device_code = device_serial || crypto.randomUUID().substring(0, 8).toUpperCase()

      // D. Create/Update Device
      // Check if device exists by serial/code
      const { data: existing } = await supabase
        .from('devices')
        .select('id')
        .eq('device_code', device_code)
        .single()

      let deviceResult
      if (existing) {
        // Update
        deviceResult = await supabase
          .from('devices')
          .update({
            company_id,
            store_id,
            group_id,
            channel_id,
            region_id,
            device_token,
            status: 'active', // Auto-activate for now as per flow "Inicia sincronização"
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()
      } else {
        // Insert
        deviceResult = await supabase
          .from('devices')
          .insert({
            device_code,
            name: device_name || `Device ${device_code}`,
            company_id,
            store_id,
            group_id,
            channel_id,
            region_id,
            device_token,
            status: 'active',
            camera_enabled: false,
            is_active: true
          })
          .select()
          .single()
      }

      if (deviceResult.error) throw deviceResult.error

      // Add to group members if not already
      if (group_id) {
          await supabase.from('device_group_members').upsert({
              device_id: deviceResult.data.id,
              group_id: group_id
          }, { onConflict: 'device_id,group_id' })
      }

      return new Response(
        JSON.stringify({
          device_token,
          channel_version: 1, // Placeholder
          sync_interval: 300
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Get Config (Protected)
    if (path === 'config' && req.method === 'GET') {
        const authHeader = req.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')
        
        if (!token) {
             return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
        }

        const { data: device, error } = await supabase
            .from('devices')
            .select('*, channel:distribution_channels(*)')
            .eq('device_token', token)
            .single()

        if (error || !device) {
             return new Response(JSON.stringify({ error: 'Device not found' }), { status: 401, headers: corsHeaders })
        }

        // Fetch Playlists for this channel
        // Logic: Device -> Channel -> Playlists (via playlist_channels?)
        // Assuming relationship: playlist_channels (channel_id, playlist_id)
        // Or using existing logic from memory: "Buscar playlists vinculadas ao channel"
        let playlists: unknown[] = []
        if (device.channel_id) {
            const { data: plData } = await supabase
                .from('playlist_channels')
                .select(`
                    position,
                    playlist:playlists (*)
                `)
                .eq('channel_id', device.channel_id)
                .order('position')
            
            playlists = (plData ?? []).map((p: { playlist: unknown }) => p.playlist)
        }

        return new Response(
            JSON.stringify({
                channel: device.channel,
                playlists,
                rules: device.channel?.rules || {},
                version: device.channel?.version || 1
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 4. Heartbeat
    if (path === 'heartbeat' && req.method === 'POST') {
        const authHeader = req.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

        const { error } = await supabase
            .from('devices')
            .update({ 
                last_seen_at: new Date().toISOString(),
                status: 'online'
            })
            .eq('device_token', token)

        if (error) throw error

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 5. Proof of Play
    if (path === 'proof' && req.method === 'POST') {
        const authHeader = req.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
        
        // Get device_id from token
        const { data: device } = await supabase.from('devices').select('id').eq('device_token', token).single()
        if (!device) return new Response(JSON.stringify({ error: 'Device not found' }), { status: 401, headers: corsHeaders })

        const { media_id, played_at, duration } = await req.json()

        // Insert into analytics/logs table
         const { error } = await supabase.from('media_play_logs').insert({
             device_id: device.id,
             media_id: media_id || null, // handle null if passed
             played_at: played_at || new Date().toISOString(),
             duration: duration || 0
         })

         if (error) {
            console.error('Proof of play error:', error)
            // Don't fail the request if log fails? Or return error?
            // Usually logging is best effort.
         }

         return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ error: 'Not Found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
