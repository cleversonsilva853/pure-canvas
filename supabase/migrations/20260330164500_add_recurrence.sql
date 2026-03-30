-- Adicionar coluna de recorrência
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none'
CHECK (recurrence IN ('none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'));
