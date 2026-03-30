import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { titulo, descricao, data_hora } = await req.json();

    // 1. Agendar no OneSignal
    const onesignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [user.id],
        contents: { en: titulo, pt: titulo },
        headings: { en: titulo, pt: titulo },
        subtitle: { en: descricao, pt: descricao },
        send_after: data_hora, // ISO string
      }),
    });

    const onesignalData = await onesignalResponse.json();

    if (!onesignalResponse.ok) {
        throw new Error(onesignalData.errors?.[0] || "Erro ao agendar no OneSignal");
    }

    // 2. Salvar no Banco de Dados
    const { data: notification, error: dbError } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: user.id,
          titulo,
          descricao,
          data_hora,
          status: "pendente",
          onesignal_id: onesignalData.id,
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify(notification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
