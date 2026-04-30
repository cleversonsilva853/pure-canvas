-- Create contas_a_pagar table
CREATE TABLE IF NOT EXISTS public.contas_a_pagar (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    observation TEXT,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT false NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: user_id represents the owner of the bill. It can be a personal user_id, or the business owner's user_id, or a couple's user_id.

-- Create policies
ALTER TABLE public.contas_a_pagar ENABLE ROW LEVEL SECURITY;

-- Allow read access for users or couple members or business members
CREATE POLICY "Users can view their own contas_a_pagar" 
ON public.contas_a_pagar
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM couple_members
    WHERE couple_id::text = contas_a_pagar.user_id::text
    AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM business_members
    WHERE owner_id = contas_a_pagar.user_id
    AND member_id = auth.uid()
  )
);

-- Allow insert/update/delete access
CREATE POLICY "Users can insert their own contas_a_pagar"
ON public.contas_a_pagar
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM couple_members
    WHERE couple_id::text = contas_a_pagar.user_id::text
    AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM business_members
    WHERE owner_id = contas_a_pagar.user_id
    AND member_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own contas_a_pagar"
ON public.contas_a_pagar
FOR UPDATE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM couple_members
    WHERE couple_id::text = contas_a_pagar.user_id::text
    AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM business_members
    WHERE owner_id = contas_a_pagar.user_id
    AND member_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own contas_a_pagar"
ON public.contas_a_pagar
FOR DELETE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM couple_members
    WHERE couple_id::text = contas_a_pagar.user_id::text
    AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM business_members
    WHERE owner_id = contas_a_pagar.user_id
    AND member_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.contas_a_pagar;
