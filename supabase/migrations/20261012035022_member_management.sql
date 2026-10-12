-- Owners can change a member's role and remove members.
--
-- Only owners, and only for other non-owner members: an owner can't change
-- their own role or remove themselves, and nobody can promote to or demote
-- from owner here (that's a future ownership transfer). The memberships
-- trigger still guarantees every company keeps an owner.
--
-- list_team_members also returns phone, for the member drawer's Call button.

create or replace function public.change_member_role(target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  co uuid;
  current_role_name text;
begin
  select am.company_id into co
  from public.get_active_membership() am
  where am.role = 'owner';

  if co is null then
    raise exception 'Only owners can change roles';
  end if;

  if target_user = uid then
    raise exception 'You can''t change your own role';
  end if;

  if new_role is null or new_role not in ('project_manager', 'crew') then
    raise exception 'Choose crew or manager';
  end if;

  select m.role into current_role_name
  from public.memberships m
  where m.company_id = co and m.user_id = target_user
  for update;

  if not found then
    raise exception 'Member not found';
  end if;

  if current_role_name = 'owner' then
    raise exception 'Owners can''t be changed here';
  end if;

  update public.memberships
  set role = new_role
  where company_id = co and user_id = target_user;
end;
$$;

create or replace function public.remove_member(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  co uuid;
  current_role_name text;
begin
  select am.company_id into co
  from public.get_active_membership() am
  where am.role = 'owner';

  if co is null then
    raise exception 'Only owners can remove members';
  end if;

  if target_user = uid then
    raise exception 'You can''t remove yourself';
  end if;

  select m.role into current_role_name
  from public.memberships m
  where m.company_id = co and m.user_id = target_user
  for update;

  if not found then
    raise exception 'Member not found';
  end if;

  if current_role_name = 'owner' then
    raise exception 'Owners can''t be removed';
  end if;

  -- Access ends on their next request: every policy checks memberships.
  -- Their photos and documents stay with the projects.
  delete from public.memberships
  where company_id = co and user_id = target_user;

  update public.users
  set active_company_id = null
  where id = target_user and active_company_id = co;
end;
$$;

-- Return type changes (adds phone), so drop and recreate.
drop function public.list_team_members();

create function public.list_team_members()
returns table (
  user_id uuid, full_name text, email text, phone text, role text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.full_name, a.email::text, u.phone, m.role, m.created_at
  from public.memberships m
  join public.users u on u.id = m.user_id
  join auth.users a on a.id = m.user_id
  where m.company_id = (select am.company_id from public.get_active_membership() am)
  order by
    case m.role when 'owner' then 0 when 'project_manager' then 1 else 2 end,
    u.full_name;
$$;

revoke all on function public.change_member_role(uuid, text) from public, anon;
revoke all on function public.remove_member(uuid) from public, anon;
revoke all on function public.list_team_members() from public, anon;

grant execute on function public.change_member_role(uuid, text) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
grant execute on function public.list_team_members() to authenticated;
