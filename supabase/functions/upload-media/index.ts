import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1"
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.18"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// Thumbnail settings
const THUMBNAIL_WIDTH = 1280
const THUMBNAIL_HEIGHT = 720

Deno.serve(async (req) => {
  console.log('=== upload-media function called ===')
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Step 1: Verify authentication
    console.log('Step 1: Verifying authentication...')
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
      console.error('Missing R2 credentials:', { accountId: !!accountId, accessKeyId: !!accessKeyId, secretAccessKey: !!secretAccessKey, bucketName: !!bucketName })
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

    // Step 2: Validate file
    console.log('Step 2: Validating file...')
    console.log('File details:', { name: fileName, type: fileType, size: file.size })

    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(fileType.toLowerCase())
    const isVideo = ALLOWED_VIDEO_TYPES.includes(fileType.toLowerCase())
    
    if (!isImage && !isVideo) {
      console.error('Invalid file type:', fileType)
      return new Response(
        JSON.stringify({ 
          error: 'Tipo de arquivo não permitido', 
          details: `Tipos permitidos: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(', ')}`,
          received: fileType
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error('File too large:', file.size)
      return new Response(
        JSON.stringify({ 
          error: 'Arquivo muito grande', 
          details: `Tamanho máximo: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          received: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('File validation passed:', { isImage, isVideo })

    // Generate unique file keys
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileKey = `media/${timestamp}-${sanitizedName}`
    const thumbnailKey = `thumbnails/${timestamp}-${sanitizedName.replace(/\.[^.]+$/, '.jpg')}`

    // Create AWS client for R2 using aws4fetch
    const r2 = new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: 's3',
      region: 'auto',
    })

    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`
    const uploadUrl = `${r2Endpoint}/${bucketName}/${fileKey}`
    const thumbnailUploadUrl = `${r2Endpoint}/${bucketName}/${thumbnailKey}`

    // Step 3: Upload original file to R2
    console.log('Step 3: Uploading original file to R2...')
    const fileBuffer = await file.arrayBuffer()
    const uploadResponse = await r2.fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': fileType,
        'Content-Length': file.size.toString(),
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

    console.log('Original file uploaded successfully:', fileKey)

    // Step 4: Build public URLs
    console.log('Step 4: Building public URLs...')
    
    // Get public URL from environment - REQUIRED for proper access
    const publicBaseUrl = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL')
    
    if (!publicBaseUrl) {
      console.error('CLOUDFLARE_R2_PUBLIC_URL not configured')
      return new Response(
        JSON.stringify({ error: 'Storage public URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const publicFileUrl = `${publicBaseUrl}/${fileKey}`
    // For images, use the main file as thumbnail; for videos, we'll leave it null
    const publicThumbnailUrl = isImage ? publicFileUrl : null
    const thumbnailGenerated = isImage
    let resolution: string | null = null
    let duration: number | null = null
    
    console.log('Public file URL:', publicFileUrl)
    console.log('Public thumbnail URL:', publicThumbnailUrl)
    
    // Step 5: Verify public access
    console.log('Step 5: Verifying public access...')
    try {
      const accessCheck = await fetch(publicFileUrl, { method: 'HEAD' })
      if (accessCheck.ok) {
        console.log('Public access verified successfully')
      } else {
        console.warn('Public access check returned:', accessCheck.status)
      }
    } catch (accessError) {
      console.warn('Access verification skipped:', accessError)
    }

    // Step 6: Save to database
    console.log('Step 6: Saving media record to database...')
    const mediaType = isVideo ? 'video' : 'image'

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: mediaItem, error: insertError } = await supabaseAdmin
      .from('media_items')
      .insert({
        name: fileName,
        type: mediaType,
        file_url: publicFileUrl,
        file_size: file.size,
        duration: duration || (isImage ? 10 : null), // Default 10s for images
        resolution: resolution,
        status: 'active', // Always active once uploaded successfully
        thumbnail_url: publicThumbnailUrl,
        metadata: {
          r2_key: fileKey,
          thumbnail_key: thumbnailKey,
          content_type: fileType,
          uploaded_by: user.email,
          thumbnail_generated: thumbnailGenerated,
          validated_at: new Date().toISOString(),
          thumbnail_size: { width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT },
          original_signed_url: uploadUrl
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

    console.log('Media item created successfully:', mediaItem.id)
    console.log('=== Upload completed successfully ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        mediaItem,
        fileUrl: publicFileUrl,
        thumbnailUrl: publicThumbnailUrl,
        r2Key: fileKey,
        thumbnailGenerated,
        validation: {
          type: mediaType,
          size: file.size,
          contentType: fileType,
          validatedAt: new Date().toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})