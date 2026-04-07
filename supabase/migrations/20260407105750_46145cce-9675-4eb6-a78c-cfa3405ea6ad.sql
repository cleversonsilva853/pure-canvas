
CREATE TABLE public.contas_a_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  observation TEXT,
  is_received BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_a_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own contas_a_receber"
ON public.contas_a_receber
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Couple members can view contas_a_receber"
ON public.contas_a_receber
FOR SELECT
TO authenticated
USING (check_are_in_same_couple(auth.uid(), user_id));

CREATE TRIGGER update_contas_a_receber_updated_at
BEFORE UPDATE ON public.contas_a_receber
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
