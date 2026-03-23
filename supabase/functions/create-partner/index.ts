import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the calling user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has a couple
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: existingCouple } = await adminClient
      .from("couples")
      .select("id")
      .or(`user1_id.eq.${callingUser.id},user2_id.eq.${callingUser.id}`)
      .maybeSingle();

    if (existingCouple) {
      return new Response(JSON.stringify({ error: "Você já possui um vínculo de casal" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: "Nome, email e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create partner user via admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError) {
      const msg = createError.message.includes("already been registered")
        ? "Este email já está cadastrado"
        : createError.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create couple record
    const { data: coupleData, error: coupleError } = await adminClient
      .from("couples")
      .insert({
        user1_id: callingUser.id,
        user2_id: newUser.user!.id,
        name: "Nosso Casal",
      })
      .select()
      .single();

    if (coupleError) {
      return new Response(JSON.stringify({ error: "Erro ao criar vínculo: " + coupleError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create default wallets
    await adminClient.from("couple_wallets").insert([
      { couple_id: coupleData.id, name: "Carteira Compartilhada", type: "shared", color: "#EC4899" },
      { couple_id: coupleData.id, name: "Minha Carteira", type: "individual", owner_id: callingUser.id, color: "#3B82F6" },
      { couple_id: coupleData.id, name: "Minha Carteira", type: "individual", owner_id: newUser.user!.id, color: "#8B5CF6" },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        couple: coupleData,
        partner: { id: newUser.user!.id, email, name },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno: " + (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
