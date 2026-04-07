-- Fix notification status constraint to allow 'failed' status
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_status_check 
  CHECK (status IN ('pending', 'sent', 'cancelled', 'failed'));
