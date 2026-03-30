-- Habilitar extensões necessárias para agendamento
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função que será chamada pelo Cron para disparar notificações pendentes
CREATE OR REPLACE FUNCTION public.process_pending_notifications()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, titulo, descricao, user_id 
        FROM public.notifications 
        WHERE status = 'pendente' AND data_hora <= now()
    LOOP
        -- Chamar a Edge Function para enviar o push
        -- Nota: Você precisará substituir a URL pela URL do seu projeto
        PERFORM net.http_post(
            url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/create-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', (SELECT 'Bearer ' || setting FROM jsonb_to_record('{"setting": "YOUR_SUPABASE_SERVICE_ROLE_KEY"}'::jsonb) AS x(setting))
            ),
            body := jsonb_build_object(
                'titulo', r.titulo,
                'descricao', r.descricao,
                'user_id', r.user_id,
                'isCron', true
            )
        );

        -- Marcar como enviado para não repetir
        UPDATE public.notifications SET status = 'enviado' WHERE id = r.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Agendar para rodar a cada 1 minuto
SELECT cron.schedule('process-notifications', '* * * * *', 'SELECT public.process_pending_notifications()');
