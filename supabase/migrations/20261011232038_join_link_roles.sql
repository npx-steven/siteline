-- Join links carry a role, requests expire, and the team list gets emails.
--
-- * Each company now has one live link per role (crew, project_manager). A
--   request records the role of the link it came through; the owner still
--   picks the final role when approving.
-- * Pending requests expire 14 days after they're made. Expiry is applied
--   lazily: expired rows are hidden from owners, can't be approved, and are
--   marked 'expired' the next time their requester asks again.
-- * list_team_members() returns teammates with their email, which lives in
--   auth.users and isn't otherwise readable.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.join_links
  add column role text not null default 'crew'
    check (role in ('project_manager', 'crew'));

drop index public.join_links_one_live_per_company;
create unique index join_links_one_live_per_company_role
  on public.join_links (company_id, role)
  where revoked_at is null;

alter table public.join_requests
  add column requested_role text not null default 'crew'
    check (requested_role in ('project_manager', 'crew'));

alter table public.join_requests drop constraint join_requests_status_check;
alter table public.join_requests
  add constraint join_requests_status_check
    check (status in ('pending', 'approved', 'declined', 'cancelled', 'expired'));

-- ---------------------------------------------------------------------------
-- Owner: links, one per role
-- ---------------------------------------------------------------------------

drop function public.get_join_link(boolean);

create function public.get_join_link(link_role text default 'crew', rotate boolean default false)
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

  if link_role is null or link_role not in ('project_manager', 'crew') then
    raise exception 'Choose crew or manager';
  end if;

  -- Serialize per company so two drawers opening at once can't both insert.
  perform 1 from public.companies c where c.id = co for update;

  select l.token, l.expires_at into live_token, live_expires
  from public.join_links l
  where l.company_id = co and l.role = link_role and l.revoked_at is null;

  if live_token is not null and not rotate and live_expires > now() then
    return query select live_token, live_expires;
    return;
  end if;

  update public.join_links
  set revoked_at = now()
  where company_id = co and role = link_role and revoked_at is null;

  insert into public.join_links (company_id, role, token, created_by, expires_at)
  values (co, link_role, private.new_join_token(), uid, now() + interval '7 days')
  returning token, expires_at into live_token, live_expires;

  return query select live_token, live_expires;
end;
$$;

-- ---------------------------------------------------------------------------
-- Requester
-- ---------------------------------------------------------------------------

create or replace function public.request_to_join(link_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  co uuid;
  link_role text;
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

  select l.company_id, l.role into co, link_role
  from public.join_links l
  where l.token = link_token
    and l.revoked_at is null
    and l.expires_at > now();

  if co is null then
    raise exception 'This join link is no longer valid';
  end if;

  -- An expired request no longer blocks a new one.
  update public.join_requests
  set status = 'expired', decided_at = now()
  where user_id = uid
    and status = 'pending'
    and created_at <= now() - interval '14 days';

  select r.id, r.company_id into open_request
  from public.join_requests r
  where r.user_id = uid and r.status = 'pending';

  if found then
    if open_request.company_id = co then
      return open_request.id;
    end if;
    raise exception 'You already have a pending request to join another company';
  end if;

  insert into public.join_requests (company_id, user_id, requested_role)
  values (co, uid, link_role)
  returning id into new_request;

  return new_request;
end;
$$;

-- The caller's latest open, declined or expired request.
create or replace function public.get_my_join_request()
returns table (request_status text, company_name text, requested_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when r.status = 'pending' and r.created_at <= now() - interval '14 days'
        then 'expired'
      else r.status
    end,
    c.name,
    r.created_at
  from public.join_requests r
  join public.companies c on c.id = r.company_id
  where r.user_id = (select auth.uid())
    and r.status in ('pending', 'declined', 'expired')
  order by r.created_at desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Owner: review
-- ---------------------------------------------------------------------------

drop function public.list_join_requests();

create function public.list_join_requests()
returns table (
  request_id uuid, full_name text, email text, requested_role text,
  requested_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, u.full_name, a.email::text, r.requested_role, r.created_at
  from public.join_requests r
  join public.users u on u.id = r.user_id
  join auth.users a on a.id = r.user_id
  where r.status = 'pending'
    and r.created_at > now() - interval '14 days'
    and r.company_id = (
      select am.company_id from public.get_active_membership() am
      where am.role = 'owner'
    )
  order by r.created_at desc;
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
  select r.company_id, r.user_id, r.status, r.created_at into req
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

  if req.created_at <= now() - interval '14 days' then
    raise exception 'This request has expired';
  end if;

  if new_role is null or new_role not in ('project_manager', 'crew') then
    raise exception 'Choose crew or manager';
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

-- ---------------------------------------------------------------------------
-- Team list
-- ---------------------------------------------------------------------------

-- Members of the caller's active company with their email. Any member can see
-- the team; the role decides only what they can change.
create or replace function public.list_team_members()
returns table (user_id uuid, full_name text, email text, role text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.full_name, a.email::text, m.role, m.created_at
  from public.memberships m
  join public.users u on u.id = m.user_id
  join auth.users a on a.id = m.user_id
  where m.company_id = (select am.company_id from public.get_active_membership() am)
  order by
    case m.role when 'owner' then 0 when 'project_manager' then 1 else 2 end,
    u.full_name;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.get_join_link(text, boolean) from public, anon;
revoke all on function public.list_join_requests() from public, anon;
revoke all on function public.list_team_members() from public, anon;

grant execute on function public.get_join_link(text, boolean) to authenticated;
grant execute on function public.list_join_requests() to authenticated;
grant execute on function public.list_team_members() to authenticated;
