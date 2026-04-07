// @ts-ignore: Deno standard server
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Supabase remote client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore: Web-push npm package
import webPush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore: Deno req type
serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Instanciar com Service Role Key para ignorar RLS e ler todas notificações agendadas
    const supabaseClient = createClient(
      // @ts-ignore: Deno global
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno global
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // @ts-ignore: Deno global
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    // @ts-ignore: Deno global
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    // @ts-ignore: Deno global
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

    // @ts-ignore: error checking
    if (error) throw error

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ message: "No pending notifications" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // LOCK: Marcar imediatamente como 'sent' para evitar que execuções
    // paralelas (overlaps de cron) processem as mesmas notificações.
    const notificationIds = notifications.map((n: any) => n.id);
    await supabaseClient
      .from('notifications')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .in('id', notificationIds);

    const userIds = [...new Set(notifications.map((n: any) => n.user_id))];

    // Buscar as inscrições dos usuários
    const { data: subsData, error: subsError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    // @ts-ignore: error checking
    if (subsError) throw subsError

    const dbOps = []

    for (const notification of notifications) {
      const userSubs = (subsData || []).filter((s: any) => s.user_id === notification.user_id)

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.description,
        data: { url: '/notifications' }
      })

      if (userSubs.length === 0) {
        dbOps.push(
          supabaseClient.from('notifications').update({
            status: 'failed',
            description: notification.description + '\n\n[AVISO]: Nenhum dispositivo push encontrado.',
            updated_at: new Date().toISOString()
          }).eq('id', notification.id)
        );
        continue;
      }

      let allSuccessfullySent = true;
      let lastErrorMessage = "";

      for (const sub of userSubs) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }

        try {
          // @ts-ignore: webPush send type
          await webPush.sendNotification(pushSubscription, payload);
        } catch (err: any) {
          console.error(`Erro envio push para ${sub.endpoint}:`, err);

          // Se o erro for 404 (Not Found) ou 410 (Gone), a inscrição é inválida.
          // Devemos removê-la para não tentar mais e não gerar duplicidade no futuro.
          if (err.statusCode === 404 || err.statusCode === 410) {
            dbOps.push(supabaseClient.from('push_subscriptions').delete().eq('id', sub.id));
          } else {
            allSuccessfullySent = false;
            lastErrorMessage = err.message || JSON.stringify(err);
          }
        }
      }

      if (!allSuccessfullySent) {
        dbOps.push(
          supabaseClient.from('notifications').update({
            status: 'failed',
            description: notification.description + '\n\n[FALHA PARCIAL]: ' + lastErrorMessage,
            updated_at: new Date().toISOString()
          }).eq('id', notification.id)
        );
      } else {
        // Sucesso total ou dispositivos limpos => Tratar recorrência
        const recurrence = notification.recurrence || 'none';
        if (recurrence !== 'none') {
          const nextDate = calculateNextDate(
            new Date(notification.scheduled_for),
            recurrence,
            notification.weekdays_config
          );
          dbOps.push(
            supabaseClient.from('notifications').update({
              status: 'pending',
              scheduled_for: nextDate.toISOString(),
              updated_at: new Date().toISOString()
            }).eq('id', notification.id)
          );
        }
        // Se não for recorrente, já marcamos como 'sent' no lock inicial.
      }
    }

    if (dbOps.length > 0) {
      await Promise.all(dbOps)
    }

    return new Response(
      JSON.stringify({ message: `Processadas ${notifications.length} notificações` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error("Erro no process-scheduled-notifications:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function calculateNextDate(current: Date, recurrence: string, weekdaysConfig?: string | null): Date {
  const nextDate = new Date(current);
  switch (recurrence) {
    case 'daily':
      // Avança exatamente 1 dia (todos os dias)
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekdays': {
      // Avança para o próximo dia da semana que esteja na lista de dias configurados
      let selectedDays: number[] = [];
      if (weekdaysConfig) {
        try {
          selectedDays = JSON.parse(weekdaysConfig).map(Number);
        } catch {
          selectedDays = [];
        }
      }
      if (selectedDays.length === 0) {
        // Fallback: avança 1 dia se não houver dias configurados
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      }
      // Avança até encontrar um dia da semana que esteja na lista
      do {
        nextDate.setDate(nextDate.getDate() + 1);
      } while (!selectedDays.includes(nextDate.getDay()));
      break;
    }
    case 'monthly': {
      // Avança 1 mês mantendo o mesmo dia do mês
      const originalDay = current.getDate();
      nextDate.setMonth(nextDate.getMonth() + 1);
      // Ajuste para meses com menos dias (ex: 31 de jan -> 28/29 de fev)
      // setMonth já normaliza automaticamente, mas garantimos o dia máximo do mês
      const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(originalDay, maxDay));
      break;
    }
    default:
      // Recorrências não reconhecidas: não avança
      break;
  }
  return nextDate;
}
