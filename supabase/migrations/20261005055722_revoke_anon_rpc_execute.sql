-- Supabase's default privileges grant EXECUTE on new public functions to anon
-- directly, so `revoke ... from public` in earlier migrations left it in place.
-- Only get_invite is meant to be callable signed out.

revoke execute on function public.create_company(text) from anon;
revoke execute on function public.accept_invite(text) from anon;
revoke execute on function public.get_active_membership() from anon;
revoke execute on function public.find_all_projects() from anon;
revoke execute on function public.find_projects_near(double precision, double precision, double precision) from anon;
revoke execute on function public.get_projects_with_thumbnails() from anon;

-- Event trigger function; never meant to be called through the API.
revoke execute on function public.rls_auto_enable() from anon, authenticated;
