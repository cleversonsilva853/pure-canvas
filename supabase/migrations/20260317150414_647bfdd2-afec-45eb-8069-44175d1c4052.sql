
-- Create function to seed default categories for new users
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Expense categories
  INSERT INTO public.categories (user_id, name, type, color, icon) VALUES
    (NEW.id, 'Alimentação', 'expense', '#EF4444', 'utensils'),
    (NEW.id, 'Transporte', 'expense', '#F97316', 'car'),
    (NEW.id, 'Moradia', 'expense', '#8B5CF6', 'home'),
    (NEW.id, 'Saúde', 'expense', '#EC4899', 'heart'),
    (NEW.id, 'Educação', 'expense', '#3B82F6', 'book'),
    (NEW.id, 'Lazer', 'expense', '#10B981', 'gamepad'),
    (NEW.id, 'Vestuário', 'expense', '#F59E0B', 'shirt'),
    (NEW.id, 'Assinaturas', 'expense', '#6366F1', 'repeat'),
    (NEW.id, 'Outros', 'expense', '#6B7280', 'more-horizontal');

  -- Income categories
  INSERT INTO public.categories (user_id, name, type, color, icon) VALUES
    (NEW.id, 'Salário', 'income', '#10B981', 'briefcase'),
    (NEW.id, 'Freelance', 'income', '#3B82F6', 'laptop'),
    (NEW.id, 'Investimentos', 'income', '#8B5CF6', 'trending-up'),
    (NEW.id, 'Outros', 'income', '#6B7280', 'more-horizontal');

  RETURN NEW;
END;
$$;

-- Trigger after profile creation (which happens after user signup)
CREATE TRIGGER on_profile_created_seed_categories
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();
