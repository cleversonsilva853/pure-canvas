-- Remover coluna antiga se existir
ALTER TABLE public.notifications DROP COLUMN IF EXISTS onesignal_id;

-- Tabela para armazenar inscrições de Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Configuração do pg_cron para agendamento (Apenas Superusers/Admins via Dashboard SQL)
-- Certifique-se de que a extensão pg_net e pg_cron estão ativadas no seu projeto Supabase.
CREATE EXTENSION IF NOT EXISTS pg_net;
-- A extensão pg_cron geralmente vem ativada no Supabase ou deve ser ativada na interface "Database > Extensions"

-- Função banco para chamar a Edge Function de agendamento usando a REST API do Supabase
-- IMPORTANTE: Substitua sua_url_do_projeto e sua_anon_key !!
-- Como alternativa mais simples ao pg_net, você pode configurar o "Cron Integrations" no painel do Supabase.

-- Exemplo manual de envio a cada 1 minuto (via pg_cron e pg_net):
-- SELECT cron.schedule(
--   'invoke-scheduled-notifications',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--       url:='https://SEU_PROJETO.supabase.co/functions/v1/process-scheduled-notifications',
--       headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer SUA_ANON_KEY')
--   )
--   $$
-- );
