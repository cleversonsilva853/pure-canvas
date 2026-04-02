
CREATE TABLE public.business_expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own expense categories"
ON public.business_expense_categories
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Shared business expense categories access"
ON public.business_expense_categories
FOR ALL
TO authenticated
USING (is_business_member(user_id, auth.uid()))
WITH CHECK (is_business_member(user_id, auth.uid()));

CREATE TRIGGER update_business_expense_categories_updated_at
BEFORE UPDATE ON public.business_expense_categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
