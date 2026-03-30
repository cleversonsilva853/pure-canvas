import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import * as webpush from "https://esm.sh/web-push@3.6.6";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Ler o corpo primeiro para saber quem é o usuário
    const body = await req.json();
    const { titulo, descricao, data_hora, isUpdate, id, isCron, user_id: cron_user_id } = body;

    let target_user_id;

    if (isCron && cron_user_id) {
      // Se for chamado pelo Cron, confiamos no ID passado (pois usa Service Role)
      target_user_id = cron_user_id;
    } else {
      // Se for chamado pelo front, validamos o usuário via Bearer token
      const authHeader = req.headers.get("Authorization")!;
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      target_user_id = user.id;
    }

    // 1. Configurar VAPID
    webpush.setVapidDetails(
      'mailto:exemplo@seu-dominio.com',
      VAPID_PUBLIC_KEY!,
      VAPID_PRIVATE_KEY!
    );

    // 2. Buscar assinaturas
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", target_user_id);

    if (subs && subs.length > 0) {
      const payload = JSON.stringify({
        title: titulo,
        body: descricao || "Lembrete do InforControl",
        url: "/notifications"
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            payload
          );
        } catch (err) {
          console.error("Erro no envio:", err);
          // Se o endpoint for inválido, poderíamos limpar a assinatura aqui
        }
      }
    }

    // 3. Salvar no Banco (apenas se for criação/update via Front)
    let result = { message: "Disparado via Cron" };
    if (!isCron) {
      if (isUpdate && id) {
        const { data, error } = await supabase
          .from("notifications")
          .update({ titulo, descricao, data_hora, status: "pendente" })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("notifications")
          .insert([{ user_id: target_user_id, titulo, descricao, data_hora, status: "pendente" }])
          .select()
          .single();
        if (error) throw error;
        result = data;
      }
    }

    return new Response(JSON.stringify(result), {
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
