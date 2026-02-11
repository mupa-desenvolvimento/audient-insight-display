import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const tools = [
      {
        type: "function",
        function: {
          name: "create_playlist",
          description: "Create a new playlist in the digital signage system",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "The name of the playlist" },
              description: { type: "string", description: "Description of the playlist" },
            },
            required: ["name"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_playlists",
          description: "List existing playlists to see their names and IDs",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "integer", description: "Limit the number of results" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "update_playlist",
          description: "Update an existing playlist by ID",
          parameters: {
            type: "object",
            properties: {
              id: { type: "string", description: "The ID of the playlist to update" },
              name: { type: "string", description: "New name of the playlist" },
              description: { type: "string", description: "New description" },
              is_active: { type: "boolean", description: "Set active status" },
            },
            required: ["id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "delete_playlist",
          description: "Delete a playlist by ID",
          parameters: {
            type: "object",
            properties: {
              id: { type: "string", description: "The ID of the playlist to delete" },
            },
            required: ["id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_devices",
          description: "List devices registered in the system",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "integer", description: "Limit the number of results" },
              status: { type: "string", description: "Filter by status (online, offline, pending)" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_media",
          description: "List media items (images, videos) in the library",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "integer", description: "Limit the number of results" },
              type: { type: "string", description: "Filter by type (image, video)" },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_system_stats",
          description: "Get overall system statistics (total devices, playlists, media, stores)",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
    ];

    // First call to AI with tools
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é o assistente virtual da plataforma MUPA Digital Signage.
Você pode gerenciar playlists (criar, listar, atualizar, excluir), listar dispositivos, listar mídias e consultar estatísticas do sistema.
Responda sempre em português brasileiro. Seja conciso e útil.
Quando o usuário pedir para criar, listar, atualizar ou excluir playlists, use as ferramentas apropriadas.
Quando pedir informações sobre dispositivos, mídias ou estatísticas, use as ferramentas correspondentes.`,
          },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido, tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completion = await response.json();
    const responseMessage = completion.choices[0].message;

    let finalResponse = responseMessage.content;
    let actionTaken = false;
    let actionDescription = "";

    // Handle Tool Calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      let toolResult = "";

      if (functionName === "create_playlist") {
        const { data, error } = await supabaseClient
          .from("playlists")
          .insert({
            name: functionArgs.name,
            description: functionArgs.description || null,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          toolResult = `Erro ao criar playlist: ${error.message}`;
        } else {
          toolResult = `Playlist '${data.name}' criada com sucesso. ID: ${data.id}.`;
          actionTaken = true;
          actionDescription = `Playlist "${data.name}" criada.`;
        }
      } else if (functionName === "list_playlists") {
        const { data, error } = await supabaseClient
          .from("playlists")
          .select("id, name, is_active, description")
          .limit(functionArgs.limit || 10)
          .order("created_at", { ascending: false });

        if (error) {
          toolResult = `Erro ao listar playlists: ${error.message}`;
        } else {
          toolResult = `Playlists encontradas: ${JSON.stringify(data)}`;
        }
      } else if (functionName === "update_playlist") {
        const updates: Record<string, unknown> = {};
        if (functionArgs.name) updates.name = functionArgs.name;
        if (functionArgs.description) updates.description = functionArgs.description;
        if (functionArgs.is_active !== undefined) updates.is_active = functionArgs.is_active;

        const { data, error } = await supabaseClient
          .from("playlists")
          .update(updates)
          .eq("id", functionArgs.id)
          .select()
          .single();

        if (error) {
          toolResult = `Erro ao atualizar playlist: ${error.message}`;
        } else {
          toolResult = `Playlist atualizada: ${JSON.stringify(data)}`;
          actionTaken = true;
          actionDescription = `Playlist "${data.name}" atualizada.`;
        }
      } else if (functionName === "delete_playlist") {
        const { error } = await supabaseClient
          .from("playlists")
          .delete()
          .eq("id", functionArgs.id);

        if (error) {
          toolResult = `Erro ao excluir playlist: ${error.message}`;
        } else {
          toolResult = `Playlist excluída com sucesso.`;
          actionTaken = true;
          actionDescription = "Playlist excluída.";
        }
      } else if (functionName === "list_devices") {
        let query = supabaseClient
          .from("devices")
          .select("id, name, device_code, status, is_active, last_seen_at")
          .limit(functionArgs.limit || 10)
          .order("created_at", { ascending: false });

        if (functionArgs.status) {
          query = query.eq("status", functionArgs.status);
        }

        const { data, error } = await query;

        if (error) {
          toolResult = `Erro ao listar dispositivos: ${error.message}`;
        } else {
          toolResult = `Dispositivos: ${JSON.stringify(data)}`;
        }
      } else if (functionName === "list_media") {
        let query = supabaseClient
          .from("media_items")
          .select("id, name, type, file_url, duration, status")
          .limit(functionArgs.limit || 10)
          .order("created_at", { ascending: false });

        if (functionArgs.type) {
          query = query.eq("type", functionArgs.type);
        }

        const { data, error } = await query;

        if (error) {
          toolResult = `Erro ao listar mídias: ${error.message}`;
        } else {
          toolResult = `Mídias: ${JSON.stringify(data)}`;
        }
      } else if (functionName === "get_system_stats") {
        const [devices, playlists, media, stores] = await Promise.all([
          supabaseClient.from("devices").select("id", { count: "exact", head: true }),
          supabaseClient.from("playlists").select("id", { count: "exact", head: true }),
          supabaseClient.from("media_items").select("id", { count: "exact", head: true }),
          supabaseClient.from("stores").select("id", { count: "exact", head: true }),
        ]);

        toolResult = JSON.stringify({
          total_devices: devices.count ?? 0,
          total_playlists: playlists.count ?? 0,
          total_media: media.count ?? 0,
          total_stores: stores.count ?? 0,
        });
      }

      // Second call to AI with tool result
      if (toolResult) {
        const secondResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `Você é o assistente virtual da plataforma MUPA Digital Signage. Responda sempre em português brasileiro. Seja conciso e útil.`,
              },
              ...messages,
              responseMessage,
              {
                role: "tool",
                tool_call_id: toolCall.id,
                content: toolResult,
              },
            ],
          }),
        });

        if (secondResponse.ok) {
          const secondCompletion = await secondResponse.json();
          finalResponse = secondCompletion.choices[0].message.content;
        }
      }
    }

    return new Response(
      JSON.stringify({
        response: finalResponse,
        action_taken: actionTaken,
        action_description: actionDescription,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
