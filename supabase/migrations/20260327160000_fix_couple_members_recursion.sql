
-- 1. Create helper functions with PL/pgSQL and SECURITY DEFINER 
-- to ensure they bypass RLS on the tables they query.
CREATE OR REPLACE FUNCTION public.check_is_couple_member(_couple_id uuid, _user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.couple_members
    WHERE couple_id = _couple_id AND user_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_are_in_same_couple(_u1 uuid, _u2 uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.couple_members cm1
    JOIN public.couple_members cm2 ON cm1.couple_id = cm2.couple_id
    WHERE cm1.user_id = _u1 AND cm2.user_id = _u2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. RESET POLICIES (Drop all to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own couple members" ON public.couple_members;
DROP POLICY IF EXISTS "Users can insert into own couples" ON public.couple_members;
DROP POLICY IF EXISTS "Users can update own couple members" ON public.couple_members;
DROP POLICY IF EXISTS "Users can delete own couple members" ON public.couple_members;
DROP POLICY IF EXISTS "Users can insert own couple member" ON public.couple_members;
DROP POLICY IF EXISTS "Users can insert partner" ON public.couple_members;

-- 3. APPLY NEW CLEAN POLICIES for couple_members
-- SELECT: Only members can see others
CREATE POLICY "couple_members_select" ON public.couple_members
FOR SELECT TO authenticated USING (check_is_couple_member(couple_id, auth.uid()));

-- INSERT: Anyone can insert THEMSELVES (to start a couple) 
-- OR an existing member can insert someone else
CREATE POLICY "couple_members_insert" ON public.couple_members
FOR INSERT TO authenticated 
WITH CHECK (
  user_id = auth.uid() 
  OR 
  check_is_couple_member(couple_id, auth.uid())
);

-- UPDATE/DELETE: Only on your own couple
CREATE POLICY "couple_members_update" ON public.couple_members
FOR UPDATE TO authenticated USING (check_is_couple_member(couple_id, auth.uid()));

CREATE POLICY "couple_members_delete" ON public.couple_members
FOR DELETE TO authenticated USING (check_is_couple_member(couple_id, auth.uid()));

-- 4. Update couples table policies
DROP POLICY IF EXISTS "Users can view own couples" ON public.couples;
DROP POLICY IF EXISTS "Users can update own couples" ON public.couples;
DROP POLICY IF EXISTS "Users can delete own couples" ON public.couples;
DROP POLICY IF EXISTS "Authenticated users can create couples" ON public.couples;

CREATE POLICY "couples_select" ON public.couples
FOR SELECT TO authenticated USING (check_is_couple_member(id, auth.uid()));

CREATE POLICY "couples_insert" ON public.couples
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "couples_update" ON public.couples
FOR UPDATE TO authenticated USING (check_is_couple_member(id, auth.uid()));

CREATE POLICY "couples_delete" ON public.couples
FOR DELETE TO authenticated USING (check_is_couple_member(id, auth.uid()));

-- 5. Update transactions policy (shared access)
DROP POLICY IF EXISTS "Users can view shared transactions" ON public.transactions;
CREATE POLICY "transactions_shared_select" ON public.transactions
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR check_are_in_same_couple(auth.uid(), user_id)
);
