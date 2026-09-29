CREATE TABLE public.team_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'Technician',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  team_member_id integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_accounts TO authenticated;
GRANT ALL ON public.team_accounts TO service_role;
ALTER TABLE public.team_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Member sees own account" ON public.team_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.workspace_owner(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT owner_id FROM public.team_accounts WHERE user_id = _uid), _uid)
$$;

DROP POLICY "kv owner all" ON public.user_kv;
CREATE POLICY "kv workspace all" ON public.user_kv FOR ALL TO authenticated
  USING (user_id = public.workspace_owner(auth.uid()))
  WITH CHECK (user_id = public.workspace_owner(auth.uid()));