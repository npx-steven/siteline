-- Join links + join requests, replacing invites.
--
-- Each company has at most one live join link. Anyone with it can *request*
-- to join; nobody gets access until an owner approves them and picks their
-- role. Links expire after 7 days (opening the invite drawer then issues a
-- fresh one) and owners can reset a link at any time, which kills the old one.
--
-- All writes go through the security definer RPCs below; clients only get
-- SELECT, and only on their own requests or, for owners, their company's.

drop function if exists public.get_invite(text);
drop function if exists public.accept_invite(text);
drop table if exists public.invites;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.join_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  token text not null unique,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

-- At most one live (unrevoked) link per company.
create unique index join_links_one_live_per_company
  on public.join_links (company_id)
  where revoked_at is null;

alter table public.join_links enable row level security;
revoke all on public.join_links from anon, authenticated;
grant select on public.join_links to authenticated;

create policy "join_links: select owner" on public.join_links
  for select to authenticated
  using (private.has_role(company_id, array['owner']));

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'cancelled')),
  -- The role the approver granted. Set exactly when approved.
  role text check (role in ('project_manager', 'crew')),
  decided_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint join_requests_role_iff_approved
    check ((status = 'approved') = (role is not null))
);

-- One open request per person (they can only belong to one company for now).
create unique index join_requests_one_pending_per_user
  on public.join_requests (user_id)
  where status = 'pending';

create index join_requests_company_pending_idx
  on public.join_requests (company_id)
  where status = 'pending';

alter table public.join_requests enable row level security;
revoke all on public.join_requests from anon, authenticated;
grant select on public.join_requests to authenticated;

create policy "join_requests: select own or owner" on public.join_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role(company_id, array['owner'])
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- 128 random bits, URL-safe (22 characters).
create or replace function private.new_join_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_');
$$;

revoke all on function private.new_join_token() from public;

-- ---------------------------------------------------------------------------
-- Owner: the company's join link
-- ---------------------------------------------------------------------------

-- Returns the live link, creating one when there is none or it has expired.
-- With rotate = true, revokes the current link and issues a new one.
create or replace function public.get_join_link(rotate boolean default false)
returns table (link_token text, link_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  co uuid;
  live_token text;
  live_expires timestamptz;
begin
  select am.company_id into co
  from public.get_active_membership() am
  where am.role = 'owner';

  if co is null then
    raise exception 'Only owners can invite teammates';
  end if;

  -- Serialize per company so two drawers opening at once can't both insert.
  perform 1 from public.companies c where c.id = co for update;

  select l.token, l.expires_at into live_token, live_expires
  from public.join_links l
  where l.company_id = co and l.revoked_at is null;

  if live_token is not null and not rotate and live_expires > now() then
    return query select live_token, live_expires;
    return;
  end if;

  update public.join_links
  set revoked_at = now()
  where company_id = co and revoked_at is null;

  insert into public.join_links (company_id, token, created_by, expires_at)
  values (co, private.new_join_token(), uid, now() + interval '7 days')
  returning token, expires_at into live_token, live_expires;

  return query select live_token, live_expires;
end;
$$;

-- ---------------------------------------------------------------------------
-- Requester
-- ---------------------------------------------------------------------------

-- Company name for a live link, or no row. Callable signed out (join page).
create or replace function public.get_join_link_info(link_token text)
returns table (company_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.name
  from public.join_links l
  join public.companies c on c.id = l.company_id
  where l.token = link_token
    and l.revoked_at is null
    and l.expires_at > now();
$$;

create or replace function public.request_to_join(link_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  co uuid;
  open_request record;
  new_request uuid;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  perform 1 from public.users u where u.id = uid for update;
  if not found then
    raise exception 'Account profile not found';
  end if;

  if exists (select 1 from public.memberships m where m.user_id = uid) then
    raise exception 'You already belong to a company';
  end if;

  select l.company_id into co
  from public.join_links l
  where l.token = link_token
    and l.revoked_at is null
    and l.expires_at > now();

  if co is null then
    raise exception 'This join link is no longer valid';
  end if;

  select r.id, r.company_id into open_request
  from public.join_requests r
  where r.user_id = uid and r.status = 'pending';

  if found then
    if open_request.company_id = co then
      return open_request.id;
    end if;
    raise exception 'You already have a pending request to join another company';
  end if;

  insert into public.join_requests (company_id, user_id)
  values (co, uid)
  returning id into new_request;

  return new_request;
end;
$$;

-- The caller's latest open or declined request, with the company name (which
-- RLS on companies would otherwise hide from a non-member).
create or replace function public.get_my_join_request()
returns table (request_status text, company_name text, requested_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.status, c.name, r.created_at
  from public.join_requests r
  join public.companies c on c.id = r.company_id
  where r.user_id = (select auth.uid())
    and r.status in ('pending', 'declined')
  order by r.created_at desc
  limit 1;
$$;

create or replace function public.cancel_join_request()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.join_requests
  set status = 'cancelled', decided_at = now()
  where user_id = (select auth.uid()) and status = 'pending';
$$;

-- ---------------------------------------------------------------------------
-- Owner: review requests
-- ---------------------------------------------------------------------------

-- Pending requests for the caller's active company, with the requester's name
-- and email (requesters aren't teammates yet, so RLS hides their profile).
create or replace function public.list_join_requests()
returns table (
  request_id uuid, full_name text, email text, requested_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, u.full_name, a.email::text, r.created_at
  from public.join_requests r
  join public.users u on u.id = r.user_id
  join auth.users a on a.id = r.user_id
  where r.status = 'pending'
    and r.company_id = (
      select am.company_id from public.get_active_membership() am
      where am.role = 'owner'
    )
  order by r.created_at;
$$;

create or replace function public.approve_join_request(request_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  req record;
begin
  select r.company_id, r.user_id, r.status into req
  from public.join_requests r
  where r.id = request_id
  for update;

  -- Same message either way, so a non-owner can't probe for request ids.
  if not found then
    raise exception 'Request not found';
  end if;
  if not private.has_role(req.company_id, array['owner']) then
    raise exception 'Request not found';
  end if;

  if req.status <> 'pending' then
    raise exception 'This request was already handled';
  end if;

  if new_role is null or new_role not in ('project_manager', 'crew') then
    raise exception 'Choose crew or project manager';
  end if;

  if exists (select 1 from public.memberships m where m.user_id = req.user_id) then
    raise exception 'This person already belongs to a company';
  end if;

  insert into public.memberships (company_id, user_id, role, invited_by)
  values (req.company_id, req.user_id, new_role, uid);

  update public.users
  set active_company_id = req.company_id
  where id = req.user_id;

  update public.join_requests
  set status = 'approved', role = new_role, decided_by = uid, decided_at = now()
  where id = request_id;
end;
$$;

create or replace function public.decline_join_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req record;
begin
  select r.company_id, r.status into req
  from public.join_requests r
  where r.id = request_id
  for update;

  -- Same message either way, so a non-owner can't probe for request ids.
  if not found then
    raise exception 'Request not found';
  end if;
  if not private.has_role(req.company_id, array['owner']) then
    raise exception 'Request not found';
  end if;

  if req.status <> 'pending' then
    raise exception 'This request was already handled';
  end if;

  update public.join_requests
  set status = 'declined', decided_by = auth.uid(), decided_at = now()
  where id = request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_company now withdraws any open request, so a later approval can't
-- collide with the new membership.
-- ---------------------------------------------------------------------------

create or replace function public.create_company(company_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  trimmed text := btrim(company_name);
  new_company uuid;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if char_length(trimmed) < 2 or char_length(trimmed) > 100 then
    raise exception 'Company name must be 2 to 100 characters';
  end if;

  perform 1 from public.users u where u.id = uid for update;
  if not found then
    raise exception 'Account profile not found';
  end if;

  if exists (select 1 from public.memberships m where m.user_id = uid) then
    raise exception 'You already belong to a company';
  end if;

  update public.join_requests
  set status = 'cancelled', decided_at = now()
  where user_id = uid and status = 'pending';

  insert into public.companies (name)
  values (trimmed)
  returning id into new_company;

  insert into public.memberships (company_id, user_id, role)
  values (new_company, uid, 'owner');

  update public.users set active_company_id = new_company where id = uid;

  return new_company;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants. Supabase grants EXECUTE on new public functions to anon directly,
-- so revoke it explicitly; only get_join_link_info is for signed-out callers.
-- ---------------------------------------------------------------------------

revoke all on function public.get_join_link(boolean) from public, anon;
revoke all on function public.get_join_link_info(text) from public;
revoke all on function public.request_to_join(text) from public, anon;
revoke all on function public.get_my_join_request() from public, anon;
revoke all on function public.cancel_join_request() from public, anon;
revoke all on function public.list_join_requests() from public, anon;
revoke all on function public.approve_join_request(uuid, text) from public, anon;
revoke all on function public.decline_join_request(uuid) from public, anon;

grant execute on function public.get_join_link(boolean) to authenticated;
grant execute on function public.get_join_link_info(text) to anon, authenticated;
grant execute on function public.request_to_join(text) to authenticated;
grant execute on function public.get_my_join_request() to authenticated;
grant execute on function public.cancel_join_request() to authenticated;
grant execute on function public.list_join_requests() to authenticated;
grant execute on function public.approve_join_request(uuid, text) to authenticated;
grant execute on function public.decline_join_request(uuid) to authenticated;
