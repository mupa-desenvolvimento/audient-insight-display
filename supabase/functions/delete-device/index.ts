// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { deviceId } = await req.json()

    if (!deviceId) {
      return new Response(
        JSON.stringify({ error: 'Device ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Deleting device ${deviceId} and related data...`)

    // 1. Delete related logs and analytics
    const tablesToDelete = [
      'product_lookup_logs',
      'product_lookup_analytics',
      'device_detection_logs',
      'device_group_members'
    ]

    for (const table of tablesToDelete) {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('device_id', deviceId)
        
        if (error) {
            console.error(`Error deleting from ${table}:`, error)
            throw error
        }
    }

    // 2. Delete the device
    const { error: deviceError } = await supabase
      .from('devices')
      .delete()
      .eq('id', deviceId)

    if (deviceError) {
        console.error('Error deleting device:', deviceError)
        throw deviceError
    }

    return new Response(
      JSON.stringify({ message: 'Device deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
