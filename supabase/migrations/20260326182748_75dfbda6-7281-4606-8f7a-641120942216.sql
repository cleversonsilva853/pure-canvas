
-- Fix couple_members RLS: drop the overly permissive policy
DROP POLICY IF EXISTS "Users can manage couple members" ON public.couple_members;

-- SELECT: only see members of couples you belong to
CREATE POLICY "Users can view own couple members"
ON public.couple_members
FOR SELECT
TO authenticated
USING (
  couple_id IN (
    SELECT cm.couple_id FROM public.couple_members cm WHERE cm.user_id = auth.uid()
  )
);

-- INSERT: only add members to couples you belong to, or create first member as yourself
CREATE POLICY "Users can insert into own couples"
ON public.couple_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR
  couple_id IN (
    SELECT cm.couple_id FROM public.couple_members cm WHERE cm.user_id = auth.uid()
  )
);

-- UPDATE: only update members in your own couples
CREATE POLICY "Users can update own couple members"
ON public.couple_members
FOR UPDATE
TO authenticated
USING (
  couple_id IN (
    SELECT cm.couple_id FROM public.couple_members cm WHERE cm.user_id = auth.uid()
  )
);

-- DELETE: only delete members from your own couples
CREATE POLICY "Users can delete own couple members"
ON public.couple_members
FOR DELETE
TO authenticated
USING (
  couple_id IN (
    SELECT cm.couple_id FROM public.couple_members cm WHERE cm.user_id = auth.uid()
  )
);

-- Fix couples table RLS
CREATE POLICY "Users can view own couples"
ON public.couples
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT cm.couple_id FROM public.couple_members cm WHERE cm.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create couples"
ON public.couples
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update own couples"
ON public.couples
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT cm.couple_id FROM public.couple_members cm WHERE cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own couples"
ON public.couples
FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT cm.couple_id FROM public.couple_members cm WHERE cm.user_id = auth.uid()
  )
);
