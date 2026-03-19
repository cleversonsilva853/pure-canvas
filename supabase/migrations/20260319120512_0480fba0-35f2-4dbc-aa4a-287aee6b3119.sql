
-- Create tables first

-- Couples table
CREATE TABLE IF NOT EXISTS public.couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Nosso Casal',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own couple" ON public.couples
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can insert couple" ON public.couples
  FOR INSERT WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update own couple" ON public.couples
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Couple invites table
CREATE TABLE IF NOT EXISTS public.couple_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL,
  invitee_email text,
  invite_code text NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own invites" ON public.couple_invites
  FOR ALL USING (auth.uid() = inviter_id) WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Anyone can view pending invites" ON public.couple_invites
  FOR SELECT USING (true);

-- Now create security definer functions
CREATE OR REPLACE FUNCTION public.is_couple_member(_user_id uuid, _couple_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couples
    WHERE id = _couple_id AND (user1_id = _user_id OR user2_id = _user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_couple_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.couples
  WHERE user1_id = _user_id OR user2_id = _user_id
  LIMIT 1
$$;

-- Couple wallets
CREATE TABLE IF NOT EXISTS public.couple_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  name text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'shared',
  owner_id uuid,
  color text DEFAULT '#EC4899',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members manage wallets" ON public.couple_wallets
  FOR ALL USING (public.is_couple_member(auth.uid(), couple_id))
  WITH CHECK (public.is_couple_member(auth.uid(), couple_id));

-- Couple transactions
CREATE TABLE IF NOT EXISTS public.couple_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  wallet_id uuid REFERENCES public.couple_wallets(id),
  paid_by uuid NOT NULL,
  type text NOT NULL DEFAULT 'expense',
  expense_type text NOT NULL DEFAULT 'shared',
  amount numeric NOT NULL,
  description text,
  category text DEFAULT 'Geral',
  date date NOT NULL DEFAULT CURRENT_DATE,
  split_type text NOT NULL DEFAULT 'equal',
  split_percentage numeric NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members manage transactions" ON public.couple_transactions
  FOR ALL USING (public.is_couple_member(auth.uid(), couple_id))
  WITH CHECK (public.is_couple_member(auth.uid(), couple_id));
