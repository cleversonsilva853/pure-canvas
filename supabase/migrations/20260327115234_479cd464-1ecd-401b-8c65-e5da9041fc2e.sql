
-- 1. Create business_members table (server-controlled sharing)
CREATE TABLE public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  member_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, member_id)
);

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- RLS: members can see their own memberships
CREATE POLICY "Members can view own business memberships"
ON public.business_members FOR SELECT TO authenticated
USING (member_id = auth.uid() OR owner_id = auth.uid());

-- Only server (service_role) should insert/update/delete.
-- But we also need the partner creation flow to insert, so allow owner to add members:
CREATE POLICY "Owners can manage business members"
ON public.business_members FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 2. Create a security definer function to check business membership
CREATE OR REPLACE FUNCTION public.is_business_member(_owner_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE owner_id = _owner_id AND member_id = _member_id
  )
$$;

-- Helper: get the business owner_id for a given user (returns themselves if owner, or the owner_id if member)
CREATE OR REPLACE FUNCTION public.get_business_owner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.business_members WHERE member_id = _user_id LIMIT 1),
    _user_id
  )
$$;

-- 3. Migrate existing relationships from user_metadata into business_members
-- Insert from couple_members where the user has created_by metadata
INSERT INTO public.business_members (owner_id, member_id)
SELECT DISTINCT
  (raw_user_meta_data->>'created_by')::uuid AS owner_id,
  au.id AS member_id
FROM auth.users au
WHERE raw_user_meta_data->>'created_by' IS NOT NULL
  AND (raw_user_meta_data->>'created_by')::uuid != au.id
ON CONFLICT (owner_id, member_id) DO NOTHING;

-- 4. Drop all user_metadata-based business RLS policies
DROP POLICY IF EXISTS "RLS_FullSharedBusiness_Expenses" ON public.business_expenses;
DROP POLICY IF EXISTS "RLS_FullSharedBusiness_Products" ON public.business_products;
DROP POLICY IF EXISTS "RLS_FullSharedBusiness_Sales" ON public.business_sales;
DROP POLICY IF EXISTS "RLS_FullSharedBusiness_FoodPricing" ON public.business_food_pricing;
DROP POLICY IF EXISTS "RLS_FullSharedBusiness_Ingredients" ON public.business_ingredients;
DROP POLICY IF EXISTS "RLS_FullSharedBusiness_ProductCompositions" ON public.business_product_compositions;

-- 5. Create new secure RLS policies using business_members table

-- business_expenses
CREATE POLICY "Shared business expenses access"
ON public.business_expenses FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_business_member(user_id, auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_business_member(user_id, auth.uid())
);

-- business_products
CREATE POLICY "Shared business products access"
ON public.business_products FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_business_member(user_id, auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_business_member(user_id, auth.uid())
);

-- business_sales
CREATE POLICY "Shared business sales access"
ON public.business_sales FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_business_member(user_id, auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_business_member(user_id, auth.uid())
);

-- business_food_pricing
CREATE POLICY "Shared business food pricing access"
ON public.business_food_pricing FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_business_member(user_id, auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_business_member(user_id, auth.uid())
);

-- business_ingredients
CREATE POLICY "Shared business ingredients access"
ON public.business_ingredients FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_business_member(user_id, auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_business_member(user_id, auth.uid())
);

-- business_product_compositions (via product ownership)
CREATE POLICY "Shared business compositions access"
ON public.business_product_compositions FOR ALL TO authenticated
USING (
  product_id IN (
    SELECT id FROM public.business_products
    WHERE user_id = auth.uid()
       OR public.is_business_member(user_id, auth.uid())
  )
)
WITH CHECK (
  product_id IN (
    SELECT id FROM public.business_products
    WHERE user_id = auth.uid()
       OR public.is_business_member(user_id, auth.uid())
  )
);

-- 6. Fix transactions couple policy: split into SELECT-only for shared, restrict writes
DROP POLICY IF EXISTS "Users can see shared transactions" ON public.transactions;

CREATE POLICY "Users can view shared transactions"
ON public.transactions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR user_id IN (
    SELECT cm.user_id FROM couple_members cm
    WHERE cm.couple_id IN (
      SELECT cm2.couple_id FROM couple_members cm2 WHERE cm2.user_id = auth.uid()
    )
  )
);
