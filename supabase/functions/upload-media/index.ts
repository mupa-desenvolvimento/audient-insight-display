import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== upload-media function called ===')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Authenticated user:', user.email)

    // Get Cloudflare R2 credentials
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID')
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME')

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.error('Missing R2 credentials')
      return new Response(
        JSON.stringify({ error: 'R2 credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string || file.name
    const fileType = formData.get('fileType') as string || file.type

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Uploading file:', fileName, 'Type:', fileType, 'Size:', file.size)

    // Generate unique file key
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileKey = `media/${timestamp}-${sanitizedName}`

    // Upload to Cloudflare R2 using S3-compatible API
    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`
    const date = new Date().toUTCString()
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const region = 'auto'
    const service = 's3'

    // AWS Signature Version 4
    const encoder = new TextEncoder()
    
    async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
      const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      )
      return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
    }

    async function sha256(data: string | ArrayBuffer): Promise<string> {
      const buffer = typeof data === 'string' ? encoder.encode(data) : data
      const hash = await crypto.subtle.digest('SHA-256', buffer)
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
    }

    const fileBuffer = await file.arrayBuffer()
    const payloadHash = await sha256(fileBuffer)

    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`

    const canonicalHeaders = [
      `content-type:${fileType}`,
      `host:${accountId}.r2.cloudflarestorage.com`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
    ].join('\n') + '\n'

    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

    const canonicalRequest = [
      'PUT',
      `/${bucketName}/${fileKey}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      await sha256(canonicalRequest),
    ].join('\n')

    const kDate = await hmac(encoder.encode('AWS4' + secretAccessKey), dateStamp)
    const kRegion = await hmac(kDate, region)
    const kService = await hmac(kRegion, service)
    const kSigning = await hmac(kService, 'aws4_request')
    const signatureBuffer = await hmac(kSigning, stringToSign)
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    // Upload to R2
    const uploadResponse = await fetch(`${r2Endpoint}/${bucketName}/${fileKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': fileType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader,
      },
      body: fileBuffer,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('R2 upload failed:', uploadResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to upload to R2', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('File uploaded successfully to R2:', fileKey)

    // Generate public URL (assumes bucket has public access or custom domain)
    // For R2 public buckets, the URL format is: https://pub-{hash}.r2.dev/{key}
    // Or with custom domain: https://your-domain.com/{key}
    // For now, we'll store the key and let the frontend construct the URL
    const fileUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${fileKey}`

    // Determine media type
    const mediaType = fileType.startsWith('video/') ? 'video' : 'image'

    // Insert into media_items table
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: mediaItem, error: insertError } = await supabaseAdmin
      .from('media_items')
      .insert({
        name: fileName,
        type: mediaType,
        file_url: fileUrl,
        file_size: file.size,
        status: 'active',
        metadata: {
          r2_key: fileKey,
          content_type: fileType,
          uploaded_by: user.email,
        }
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save media record', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Media item created:', mediaItem.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        mediaItem,
        fileUrl,
        r2Key: fileKey
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
