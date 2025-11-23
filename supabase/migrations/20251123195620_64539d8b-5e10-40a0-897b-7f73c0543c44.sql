-- Allow everyone to view basic public profile information (avatar and name)
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);