-- Harden tenant isolation.
--
-- 1. Clients could write any column of their own users row, including role and
--    company_id, so any signed-in user could promote themselves to owner or
--    move into another company. Writes are now limited to the columns the app
--    edits directly, and membership changes go through security definer RPCs.
-- 2. Every company and every invite token was readable by anyone, including
--    signed-out visitors. Invites are now looked up only by their exact token.
-- 3. The photos bucket was public, so any photo URL worked forever without a
--    login. It is now private and the app serves short-lived signed URLs.

-- 1. Column-level write grants
revoke insert, update on public.users from anon, authenticated;
grant insert (id, full_name) on public.users to authenticated;
grant update (full_name, phone, gps_autofile) on public.users to authenticated;

drop policy if exists "users: update own" on public.users;
create policy "users: update own" on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke insert, update on public.companies from anon, authenticated;
grant update (name, license_number) on public.companies to authenticated;
drop policy if exists "companies: insert authenticated" on public.companies;

revoke insert, update, delete on public.invites from anon;
revoke update on public.invites from authenticated;
grant update (status) on public.invites to authenticated;

revoke insert, update, delete on public.photos from anon;
revoke update on public.photos from authenticated;
grant update (note) on public.photos to authenticated;

-- 2. Stop exposing every company and invite
drop policy if exists "companies: select by invite" on public.companies;
drop policy if exists "invites: select by token" on public.invites;

create or replace function public.get_invite(invite_token text)
returns table (company_name text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name, i.role
  from public.invites i
  join public.companies c on c.id = i.company_id
  where i.token = invite_token
    and i.status = 'pending'
    and i.expires_at > now();
$$;

revoke all on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;

create or replace function public.create_company(company_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  trimmed text := btrim(company_name);
  existing_company uuid;
  new_company uuid;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if char_length(trimmed) < 2 or char_length(trimmed) > 100 then
    raise exception 'Company name must be 2 to 100 characters';
  end if;

  select u.company_id into existing_company
  from public.users u
  where u.id = uid
  for update;

  if not found then
    raise exception 'Account profile not found';
  end if;

  if existing_company is not null then
    raise exception 'You already belong to a company';
  end if;

  insert into public.companies (name, owner_id)
  values (trimmed, uid)
  returning id into new_company;

  update public.users
  set company_id = new_company, role = 'owner'
  where id = uid;

  return new_company;
end;
$$;

revoke all on function public.create_company(text) from public;
grant execute on function public.create_company(text) to authenticated;

create or replace function public.accept_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing_company uuid;
  invite_company uuid;
  invite_role text;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select u.company_id into existing_company
  from public.users u
  where u.id = uid
  for update;

  if not found then
    raise exception 'Account profile not found';
  end if;

  if existing_company is not null then
    raise exception 'You already belong to a company';
  end if;

  select i.company_id, i.role into invite_company, invite_role
  from public.invites i
  where i.token = invite_token
    and i.status = 'pending'
    and i.expires_at > now();

  if not found then
    raise exception 'This invite is no longer valid';
  end if;

  update public.users
  set company_id = invite_company, role = invite_role
  where id = uid;

  return invite_company;
end;
$$;

revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;

-- 3. Private photos bucket
update storage.buckets set public = false where id = 'photos';
