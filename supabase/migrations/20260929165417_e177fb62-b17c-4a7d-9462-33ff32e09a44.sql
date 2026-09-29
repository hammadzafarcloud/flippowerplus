DROP POLICY IF EXISTS "Owner can view own links" ON public.booking_links;
DROP POLICY IF EXISTS "Owner can insert own links" ON public.booking_links;
DROP POLICY IF EXISTS "Owner can update own links" ON public.booking_links;
DROP POLICY IF EXISTS "Owner can delete own links" ON public.booking_links;

CREATE POLICY "Workspace can view links"
ON public.booking_links
FOR SELECT
TO authenticated
USING (owner_id = public.workspace_owner(auth.uid()));

CREATE POLICY "Workspace can insert links"
ON public.booking_links
FOR INSERT
TO authenticated
WITH CHECK (owner_id = public.workspace_owner(auth.uid()));

CREATE POLICY "Workspace can update links"
ON public.booking_links
FOR UPDATE
TO authenticated
USING (owner_id = public.workspace_owner(auth.uid()))
WITH CHECK (owner_id = public.workspace_owner(auth.uid()));

CREATE POLICY "Workspace can delete links"
ON public.booking_links
FOR DELETE
TO authenticated
USING (owner_id = public.workspace_owner(auth.uid()));

DROP POLICY IF EXISTS "Owner can view own submissions" ON public.booking_submissions;
DROP POLICY IF EXISTS "Owner can update own submissions" ON public.booking_submissions;
DROP POLICY IF EXISTS "Owner can delete own submissions" ON public.booking_submissions;

CREATE POLICY "Workspace can view submissions"
ON public.booking_submissions
FOR SELECT
TO authenticated
USING (owner_id = public.workspace_owner(auth.uid()));

CREATE POLICY "Workspace can update submissions"
ON public.booking_submissions
FOR UPDATE
TO authenticated
USING (owner_id = public.workspace_owner(auth.uid()))
WITH CHECK (owner_id = public.workspace_owner(auth.uid()));

CREATE POLICY "Workspace can delete submissions"
ON public.booking_submissions
FOR DELETE
TO authenticated
USING (owner_id = public.workspace_owner(auth.uid()));