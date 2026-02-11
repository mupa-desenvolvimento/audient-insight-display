// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    const tools = [
      {
        type: "function",
        function: {
          name: "create_playlist",
          description: "Create a new playlist",
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
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for the MUPA Digital Signage platform. 
          You can manage playlists and answer questions about the system.
          When asked to create a playlist, use the create_playlist tool.
          When asked to list playlists, use the list_playlists tool.
          Be concise and helpful.`,
        },
        ...messages,
      ],
      tools: tools as any,
      tool_choice: "auto",
    });

    const responseMessage = completion.choices[0].message;

    let finalResponse = responseMessage.content;
    let actionTaken = false;
    let actionDescription = "";

    // Handle Tool Calls
    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      let toolResult = null;

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
          toolResult = `Error creating playlist: ${error.message}`;
        } else {
          toolResult = `Playlist '${data.name}' created successfully with ID ${data.id}.`;
          actionTaken = true;
          actionDescription = `Playlist "${data.name}" criada.`;
        }
      } else if (functionName === "list_playlists") {
        const { data, error } = await supabaseClient
          .from("playlists")
          .select("id, name, is_active")
          .limit(functionArgs.limit || 5)
          .order("created_at", { ascending: false });

        if (error) {
          toolResult = `Error listing playlists: ${error.message}`;
        } else {
          toolResult = `Playlists: ${JSON.stringify(data)}`;
          actionTaken = true;
          actionDescription = "Listagem de playlists consultada.";
        }
      }

      // Send tool result back to OpenAI for final answer
      if (toolResult) {
        const secondResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            ...messages,
            responseMessage,
            {
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolResult,
            },
          ],
        });
        finalResponse = secondResponse.choices[0].message.content;
      }
    }

    return new Response(
      JSON.stringify({ response: finalResponse, action_taken: actionTaken, action_description: actionDescription }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as any).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
