
-- Drop existing policy that only checks through business_products owner
DROP POLICY IF EXISTS "Users can manage product compositions" ON public.business_product_compositions;

-- Create shared policy for business_product_compositions
CREATE POLICY "RLS_FullSharedBusiness_ProductCompositions"
ON public.business_product_compositions
FOR ALL
TO public
USING (
  product_id IN (
    SELECT id FROM business_products
    WHERE user_id = auth.uid()
       OR user_id = (((auth.jwt() -> 'user_metadata'::text) ->> 'created_by'::text))::uuid
  )
)
WITH CHECK (
  product_id IN (
    SELECT id FROM business_products
    WHERE user_id = auth.uid()
       OR user_id = (((auth.jwt() -> 'user_metadata'::text) ->> 'created_by'::text))::uuid
  )
);
