import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Instanciar com Service Role Key para ignorar RLS e ler todas notificações agendadas
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:suporte@inforcontrol.com'

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('As chaves VAPID não estão configuradas nos Secrets.')
    }

    webPush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    )

    // Buscar notificações pendentes com data/hora menor ou igual agora
    const { data: notifications, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())

    if (error) throw error

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ message: "No pending notifications" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userIds = notifications.map(n => n.user_id)

    // Buscar as inscrições dos usuários atrelados às notificações
    const { data: subsData, error: subsError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (subsError) throw subsError

    const promises = []

    for (const notification of notifications) {
      // Filtrar as inscrições apenas deste usuário
      const userSubs = (subsData || []).filter(s => s.user_id === notification.user_id)
      
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.description,
        data: { url: '/notifications' }
      })

      // Enviar os pushes para cada dispositivo cadastrado do usuário
      for (const sub of userSubs) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }

        promises.push(
          webPush.sendNotification(pushSubscription, payload)
            .catch(err => {
              console.error(`Erro ao enviar push para endpoint ${sub.endpoint}:`, err)
              // Se retornar erro 410 Gone, a inscrição expirou/foi revogada no navegador, 
              // poderíamos deletá-la da tabela push_subscriptions, mas logaremos por enquanto.
            })
        )
      }

      // Marcar alerta como enviado
      promises.push(
        supabaseClient.from('notifications').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', notification.id)
      )
    }

    await Promise.all(promises)

    return new Response(
      JSON.stringify({ message: `Processadas ${notifications.length} notificações` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error("Erro no process-scheduled-notifications:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
