import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DetectionPayload {
  device_serial: string;
  device_nickname?: string;
  detections: {
    face_descriptor?: number[];
    confidence?: number;
    is_facing_camera?: boolean;
    detected_at?: string;
    metadata?: Record<string, unknown>;
  }[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "POST") {
      const payload: DetectionPayload = await req.json();

      console.log("Recebendo detecções do dispositivo:", payload.device_serial);

      // Validar dados obrigatórios
      if (!payload.device_serial) {
        return new Response(
          JSON.stringify({ error: "device_serial é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!payload.detections || !Array.isArray(payload.detections) || payload.detections.length === 0) {
        return new Response(
          JSON.stringify({ error: "detections deve ser um array não vazio" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar dispositivo pelo serial (device_code)
      const { data: device } = await supabase
        .from("devices")
        .select("id")
        .eq("device_code", payload.device_serial)
        .single();

      // Preparar registros para inserção
      const detectionLogs = payload.detections.map((detection) => ({
        device_id: device?.id || null,
        device_serial: payload.device_serial,
        device_nickname: payload.device_nickname,
        face_descriptor: detection.face_descriptor || null,
        confidence: detection.confidence || null,
        is_facing_camera: detection.is_facing_camera ?? true,
        detected_at: detection.detected_at || new Date().toISOString(),
        metadata: detection.metadata || {},
      }));

      // Inserir registros
      const { data, error } = await supabase
        .from("device_detection_logs")
        .insert(detectionLogs)
        .select("id");

      if (error) {
        console.error("Erro ao inserir detecções:", error);
        return new Response(
          JSON.stringify({ error: "Erro ao salvar detecções", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Inseridos ${data.length} registros de detecção para ${payload.device_serial}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `${data.length} detecções registradas`,
          device_found: !!device,
          inserted_ids: data.map((d) => d.id),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET - Listar detecções de um dispositivo
    if (req.method === "GET") {
      const url = new URL(req.url);
      const deviceSerial = url.searchParams.get("device_serial");
      const limit = parseInt(url.searchParams.get("limit") || "100");

      if (!deviceSerial) {
        return new Response(
          JSON.stringify({ error: "device_serial é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("device_detection_logs")
        .select("*")
        .eq("device_serial", deviceSerial)
        .order("detected_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Erro ao buscar detecções:", error);
        return new Response(
          JSON.stringify({ error: "Erro ao buscar detecções", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, detections: data, count: data.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Método não suportado" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no endpoint:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
