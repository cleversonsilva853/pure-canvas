
CREATE POLICY "Couple members can view each other's notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  check_are_in_same_couple(auth.uid(), user_id)
);
