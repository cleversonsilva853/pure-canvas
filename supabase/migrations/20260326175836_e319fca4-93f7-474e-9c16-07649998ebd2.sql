
-- Add shared business RLS policies for business_food_pricing
CREATE POLICY "RLS_FullSharedBusiness_FoodPricing"
ON public.business_food_pricing
FOR ALL
TO public
USING (
  (auth.uid() = user_id) OR 
  (user_id = (((auth.jwt() -> 'user_metadata'::text) ->> 'created_by'::text))::uuid)
)
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id = (((auth.jwt() -> 'user_metadata'::text) ->> 'created_by'::text))::uuid)
);

-- Add shared business RLS policies for business_ingredients
CREATE POLICY "RLS_FullSharedBusiness_Ingredients"
ON public.business_ingredients
FOR ALL
TO public
USING (
  (auth.uid() = user_id) OR 
  (user_id = (((auth.jwt() -> 'user_metadata'::text) ->> 'created_by'::text))::uuid)
)
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id = (((auth.jwt() -> 'user_metadata'::text) ->> 'created_by'::text))::uuid)
);
