
-- 1. Create helper functions with SECURITY DEFINER to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.is_couple_member(_couple_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_members
    WHERE couple_id = _couple_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.are_in_same_couple(_u1 uuid, _u2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_members cm1
    JOIN public.couple_members cm2 ON cm1.couple_id = cm2.couple_id
    WHERE cm1.user_id = _u1 AND cm2.user_id = _u2
  )
$$;

-- 2. Update couple_members policies
DROP POLICY IF EXISTS "Users can view own couple members" ON public.couple_members;
CREATE POLICY "Users can view own couple members"
ON public.couple_members FOR SELECT TO authenticated
USING (public.is_couple_member(couple_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert into own couples" ON public.couple_members;
CREATE POLICY "Users can insert into own couples"
ON public.couple_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR 
  public.is_couple_member(couple_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can update own couple members" ON public.couple_members;
CREATE POLICY "Users can update own couple members"
ON public.couple_members FOR UPDATE TO authenticated
USING (public.is_couple_member(couple_id, auth.uid()));

DROP POLICY IF EXISTS "Users can delete own couple members" ON public.couple_members;
CREATE POLICY "Users can delete own couple members"
ON public.couple_members FOR DELETE TO authenticated
USING (public.is_couple_member(couple_id, auth.uid()));

-- 3. Update couples table policies
DROP POLICY IF EXISTS "Users can view own couples" ON public.couples;
CREATE POLICY "Users can view own couples"
ON public.couples FOR SELECT TO authenticated
USING (public.is_couple_member(id, auth.uid()));

DROP POLICY IF EXISTS "Users can update own couples" ON public.couples;
CREATE POLICY "Users can update own couples"
ON public.couples FOR UPDATE TO authenticated
USING (public.is_couple_member(id, auth.uid()));

DROP POLICY IF EXISTS "Users can delete own couples" ON public.couples;
CREATE POLICY "Users can delete own couples"
ON public.couples FOR DELETE TO authenticated
USING (public.is_couple_member(id, auth.uid()));

-- 4. Update transactions policy (shared access)
DROP POLICY IF EXISTS "Users can view shared transactions" ON public.transactions;
CREATE POLICY "Users can view shared transactions"
ON public.transactions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.are_in_same_couple(auth.uid(), user_id)
);
