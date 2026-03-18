
CREATE OR REPLACE FUNCTION public.seed_default_categories()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color, icon) VALUES
    (NEW.user_id, 'Alimentação', 'expense', '#EF4444', 'utensils'),
    (NEW.user_id, 'Transporte', 'expense', '#F97316', 'car'),
    (NEW.user_id, 'Moradia', 'expense', '#8B5CF6', 'home'),
    (NEW.user_id, 'Saúde', 'expense', '#EC4899', 'heart'),
    (NEW.user_id, 'Educação', 'expense', '#3B82F6', 'book'),
    (NEW.user_id, 'Lazer', 'expense', '#10B981', 'gamepad'),
    (NEW.user_id, 'Vestuário', 'expense', '#F59E0B', 'shirt'),
    (NEW.user_id, 'Assinaturas', 'expense', '#6366F1', 'repeat'),
    (NEW.user_id, 'Outros', 'expense', '#6B7280', 'more-horizontal');

  INSERT INTO public.categories (user_id, name, type, color, icon) VALUES
    (NEW.user_id, 'Salário', 'income', '#10B981', 'briefcase'),
    (NEW.user_id, 'Freelance', 'income', '#3B82F6', 'laptop'),
    (NEW.user_id, 'Investimentos', 'income', '#8B5CF6', 'trending-up'),
    (NEW.user_id, 'Outros', 'income', '#6B7280', 'more-horizontal');

  RETURN NEW;
END;
$function$;
