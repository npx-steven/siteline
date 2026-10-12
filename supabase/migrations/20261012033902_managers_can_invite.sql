-- Managers can invite and review join requests, same as owners.
--
-- A manager can share or reset either join link and accept a request as crew
-- or manager. Nobody can grant owner through a request — ownership is only
-- ever transferred — so this can't escalate anyone above manager.

-- ---------------------------------------------------------------------------
-- Read access
-- ---------------------------------------------------------------------------

drop policy "join_links: select owner" on public.join_links;
create policy "join_links: select owner or manager" on public.join_links
  for select to authenticated
  using (private.has_role(company_id, array['owner', 'project_manager']));

drop policy "join_requests: select own or owner" on public.join_requests;
create policy "join_requests: select own or manager" on public.join_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role(company_id, array['owner', 'project_manager'])
  );

-- ---------------------------------------------------------------------------
-- Join links
-- ---------------------------------------------------------------------------

create or replace function public.get_join_link(link_role text default 'crew', rotate boolean default false)
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
  where am.role in ('owner', 'project_manager');

  if co is null then
    raise exception 'Only owners and managers can invite teammates';
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
-- Review
-- ---------------------------------------------------------------------------

create or replace function public.list_join_requests()
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
      where am.role in ('owner', 'project_manager')
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

  -- Same message either way, so a non-approver can't probe for request ids.
  if not found then
    raise exception 'Request not found';
  end if;
  if not private.has_role(req.company_id, array['owner', 'project_manager']) then
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

  -- Same message either way, so a non-approver can't probe for request ids.
  if not found then
    raise exception 'Request not found';
  end if;
  if not private.has_role(req.company_id, array['owner', 'project_manager']) then
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
