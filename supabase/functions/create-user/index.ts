import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== create-user function called ===')
  console.log('Method:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    console.log('Environment vars present:', { 
      url: !!supabaseUrl, 
      serviceKey: !!supabaseServiceKey,
      anonKey: !!supabaseAnonKey 
    })

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a client with the user's auth context to verify identity
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Get the authenticated user
    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser()
    
    console.log('Auth result:', { 
      hasUser: !!callerUser, 
      userEmail: callerUser?.email,
      error: authError?.message 
    })
    
    if (authError || !callerUser) {
      console.error('Auth error:', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Caller user:', callerUser.email)

    // Check if caller is super admin using the user's authenticated client
    const { data: isSuperAdmin } = await supabaseClient.rpc('is_super_admin', { check_user_id: callerUser.id })
    
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { email, password, full_name, tenant_id, is_tenant_admin } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If tenant_id is provided, create the mapping
    if (tenant_id && newUser.user) {
      const { error: mappingError } = await supabaseAdmin
        .from('user_tenant_mappings')
        .insert({
          user_id: newUser.user.id,
          tenant_id,
          is_tenant_admin: is_tenant_admin || false
        })

      if (mappingError) {
        console.error('Error creating tenant mapping:', mappingError)
        // User was created but mapping failed - still return success but with warning
        return new Response(
          JSON.stringify({ 
            user: newUser.user,
            warning: 'User created but tenant mapping failed: ' + mappingError.message
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ user: newUser.user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
