-- Allow store owners to view profiles of users who reviewed their stores
CREATE POLICY "Store owners can view reviewers profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM store_reviews sr
    JOIN stores s ON sr.store_id = s.id
    WHERE sr.user_id = profiles.id
    AND s.owner_id = auth.uid()
  )
);