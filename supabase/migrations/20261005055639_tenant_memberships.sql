-- Tenant model: memberships (expand step).
--
-- Separates identity (users) from tenancy (memberships). A user can belong to
-- many companies, each with its own role; users.active_company_id only picks
-- which one the app shows and is never trusted for authorization.
--
-- Every policy now asks one question through two helpers in the unexposed
-- `private` schema: is the caller a member of the row's company, and with
-- which role. They read the memberships table directly (not JWT claims), so
-- removing someone takes effect on their next request.
--
-- Tenant-owned child rows (photos, documents, share_links) carry company_id
-- themselves, pinned to their project's company by a composite foreign key
-- and filled in by trigger, so the client can never choose it.
--
-- users.company_id, users.role, companies.owner_id and projects.is_starred are
-- left in place but no longer read or written. They are dropped by the
-- follow-up contract migration once this code is deployed.

-- ---------------------------------------------------------------------------
-- Private schema for authorization helpers (not exposed through the API)
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------

create table public.memberships (
  company_id uuid not null,
  user_id uuid not null,
  role text not null check (role in ('owner', 'project_manager', 'crew')),
  invited_by uuid,
  created_at timestamptz not null default now(),
  constraint memberships_pkey primary key (company_id, user_id),
  constraint memberships_company_id_fkey foreign key (company_id)
    references public.companies (id) on delete cascade,
  constraint memberships_user_id_fkey foreign key (user_id)
    references public.users (id) on delete cascade,
  constraint memberships_invited_by_fkey foreign key (invited_by)
    references public.users (id) on delete set null
);

create index memberships_user_id_idx on public.memberships (user_id);

alter table public.memberships enable row level security;

-- Read-only for clients. Every change goes through a security definer RPC.
revoke all on public.memberships from anon, authenticated;
grant select on public.memberships to authenticated;

-- Backfill from the old single-company columns.
insert into public.memberships (company_id, user_id, role, created_at)
select u.company_id, u.id, u.role, coalesce(u.created_at, now())
from public.users u
where u.company_id is not null;

insert into public.memberships (company_id, user_id, role)
select c.id, c.owner_id, 'owner'
from public.companies c
where c.owner_id is not null
on conflict (company_id, user_id) do update set role = 'owner';

-- Which company the app shows. Convenience only, never used by a policy.
alter table public.users
  add column active_company_id uuid
  references public.companies (id) on delete set null;

update public.users set active_company_id = company_id
where company_id is not null;

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------

-- security definer so policies on memberships can call them without
-- recursing into memberships' own RLS.
create or replace function private.is_member(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.company_id = target_company
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_role(target_company uuid, allowed text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.company_id = target_company
      and m.user_id = (select auth.uid())
      and m.role = any (allowed)
  );
$$;

-- True when the caller and other_user belong to at least one common company.
create or replace function private.shares_company(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.company_id = mine.company_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = other_user
  );
$$;

-- Storage objects live at {company_id}/{project_id}/{file}. Returns the
-- company id, or null when the first folder isn't a uuid.
create or replace function private.storage_company(object_name text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when (storage.foldername(object_name))[1]
      ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
  end;
$$;

revoke all on function private.is_member(uuid) from public;
revoke all on function private.has_role(uuid, text[]) from public;
revoke all on function private.shares_company(uuid) from public;
revoke all on function private.storage_company(text) from public;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_role(uuid, text[]) to authenticated;
grant execute on function private.shares_company(uuid) to authenticated;
grant execute on function private.storage_company(text) to authenticated;

-- ---------------------------------------------------------------------------
-- A company always keeps at least one owner
-- ---------------------------------------------------------------------------

create or replace function private.ensure_company_keeps_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'owner' then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' and new.role = 'owner' and new.company_id = old.company_id then
    return new;
  end if;

  -- The company itself is being deleted and its memberships cascade with it.
  if not exists (select 1 from public.companies c where c.id = old.company_id) then
    return coalesce(new, old);
  end if;

  -- Lock the company's owner rows so two owners can't demote each other at
  -- the same time and leave none.
  perform 1
  from public.memberships m
  where m.company_id = old.company_id and m.role = 'owner'
  for update;

  if not exists (
    select 1
    from public.memberships m
    where m.company_id = old.company_id
      and m.role = 'owner'
      and m.user_id <> old.user_id
  ) then
    raise exception 'A company must keep at least one owner';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger memberships_keep_owner
  before update or delete on public.memberships
  for each row execute function private.ensure_company_keeps_owner();

-- ---------------------------------------------------------------------------
-- Profile rows are created by trigger, not by the client
-- ---------------------------------------------------------------------------

-- Signup passes full_name as user metadata. Creating the profile here means an
-- auth user can never exist without one.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, full_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- company_id on tenant-owned child rows
-- ---------------------------------------------------------------------------

alter table public.projects alter column company_id set not null;
alter table public.projects
  add constraint projects_id_company_id_key unique (id, company_id);

-- Always derives company_id from the row's project, overriding anything the
-- client sent. Runs before RLS WITH CHECK, so policies see the real value.
create or replace function private.set_company_from_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.company_id into new.company_id
  from public.projects p
  where p.id = new.project_id;
  return new;
end;
$$;

-- photos
alter table public.photos add column company_id uuid;
update public.photos ph set company_id = p.company_id
from public.projects p where p.id = ph.project_id;
alter table public.photos
  alter column company_id set not null,
  alter column project_id set not null,
  drop constraint photos_project_id_fkey,
  add constraint photos_project_company_fkey foreign key (project_id, company_id)
    references public.projects (id, company_id) on delete cascade,
  drop constraint photos_uploaded_by_fkey,
  add constraint photos_uploaded_by_fkey foreign key (uploaded_by)
    references public.users (id) on delete set null;
create index photos_company_id_idx on public.photos (company_id);
create trigger photos_set_company
  before insert on public.photos
  for each row execute function private.set_company_from_project();

-- documents
alter table public.documents add column company_id uuid;
update public.documents d set company_id = p.company_id
from public.projects p where p.id = d.project_id;
alter table public.documents
  alter column company_id set not null,
  alter column project_id set not null,
  drop constraint documents_project_id_fkey,
  add constraint documents_project_company_fkey foreign key (project_id, company_id)
    references public.projects (id, company_id) on delete cascade,
  drop constraint documents_uploaded_by_fkey,
  add constraint documents_uploaded_by_fkey foreign key (uploaded_by)
    references public.users (id) on delete set null;
create index documents_company_id_idx on public.documents (company_id);
create trigger documents_set_company
  before insert on public.documents
  for each row execute function private.set_company_from_project();

-- share_links
alter table public.share_links add column company_id uuid;
update public.share_links s set company_id = p.company_id
from public.projects p where p.id = s.project_id;
alter table public.share_links
  alter column company_id set not null,
  drop constraint share_links_project_id_fkey,
  add constraint share_links_project_company_fkey foreign key (project_id, company_id)
    references public.projects (id, company_id) on delete cascade;
create index share_links_company_id_idx on public.share_links (company_id);
create trigger share_links_set_company
  before insert on public.share_links
  for each row execute function private.set_company_from_project();

-- ---------------------------------------------------------------------------
-- Column-level write grants
-- ---------------------------------------------------------------------------

-- Profiles are created by handle_new_user().
revoke insert on public.users from authenticated;

-- A project can't be moved to another company (the composite keys above
-- depend on it).
revoke update on public.projects from anon, authenticated;
grant update (name, address, location) on public.projects to authenticated;

-- Share links are created and deleted, never edited.
revoke update on public.share_links from anon, authenticated;
revoke update on public.share_link_photos from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security: one shape everywhere
-- ---------------------------------------------------------------------------

-- Drop every existing policy on the tenant tables.
drop policy if exists "companies: select own" on public.companies;
drop policy if exists "companies: update owner only" on public.companies;
drop policy if exists "documents: delete owner or pm" on public.documents;
drop policy if exists "documents: insert owner or pm" on public.documents;
drop policy if exists "documents: select own" on public.documents;
drop policy if exists "invites: insert owner only" on public.invites;
drop policy if exists "invites: select owner" on public.invites;
drop policy if exists "invites: update owner only" on public.invites;
drop policy if exists "photos: delete member" on public.photos;
drop policy if exists "photos: insert member" on public.photos;
drop policy if exists "photos: select own" on public.photos;
drop policy if exists "photos: update note member" on public.photos;
drop policy if exists "project_stars: delete own" on public.project_stars;
drop policy if exists "project_stars: insert own" on public.project_stars;
drop policy if exists "project_stars: select own" on public.project_stars;
drop policy if exists "projects: delete owner or pm" on public.projects;
drop policy if exists "projects: insert member" on public.projects;
drop policy if exists "projects: select own" on public.projects;
drop policy if exists "projects: update owner or pm" on public.projects;
drop policy if exists "share_link_photos: owner manage" on public.share_link_photos;
drop policy if exists "share_links: owner manage" on public.share_links;
drop policy if exists "users: insert own" on public.users;
drop policy if exists "users: select own" on public.users;
drop policy if exists "users: select same company" on public.users;
drop policy if exists "users: update own" on public.users;

-- users
create policy "users: select self or teammate" on public.users
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_company(id));
create policy "users: update self" on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- memberships
create policy "memberships: select teammates" on public.memberships
  for select to authenticated
  using (private.is_member(company_id));

-- companies
create policy "companies: select member" on public.companies
  for select to authenticated
  using (private.is_member(id));
create policy "companies: update owner" on public.companies
  for update to authenticated
  using (private.has_role(id, array['owner']))
  with check (private.has_role(id, array['owner']));

-- projects: every member sees and creates; owners and PMs edit and delete.
create policy "projects: select member" on public.projects
  for select to authenticated
  using (private.is_member(company_id));
create policy "projects: insert member" on public.projects
  for insert to authenticated
  with check (private.is_member(company_id));
create policy "projects: update owner or pm" on public.projects
  for update to authenticated
  using (private.has_role(company_id, array['owner', 'project_manager']))
  with check (private.has_role(company_id, array['owner', 'project_manager']));
create policy "projects: delete owner or pm" on public.projects
  for delete to authenticated
  using (private.has_role(company_id, array['owner', 'project_manager']));

-- photos: every member adds and annotates; crew delete only their own.
create policy "photos: select member" on public.photos
  for select to authenticated
  using (private.is_member(company_id));
create policy "photos: insert member" on public.photos
  for insert to authenticated
  with check (
    private.is_member(company_id)
    and uploaded_by = (select auth.uid())
  );
create policy "photos: update note member" on public.photos
  for update to authenticated
  using (private.is_member(company_id))
  with check (private.is_member(company_id));
create policy "photos: delete own or manager" on public.photos
  for delete to authenticated
  using (
    private.has_role(company_id, array['owner', 'project_manager'])
    or (private.is_member(company_id) and uploaded_by = (select auth.uid()))
  );

-- documents: every member reads; owners and PMs add and delete.
create policy "documents: select member" on public.documents
  for select to authenticated
  using (private.is_member(company_id));
create policy "documents: insert owner or pm" on public.documents
  for insert to authenticated
  with check (
    private.has_role(company_id, array['owner', 'project_manager'])
    and uploaded_by = (select auth.uid())
  );
create policy "documents: delete owner or pm" on public.documents
  for delete to authenticated
  using (private.has_role(company_id, array['owner', 'project_manager']));

-- share links: owners and PMs.
create policy "share_links: select owner or pm" on public.share_links
  for select to authenticated
  using (private.has_role(company_id, array['owner', 'project_manager']));
create policy "share_links: insert owner or pm" on public.share_links
  for insert to authenticated
  with check (
    private.has_role(company_id, array['owner', 'project_manager'])
    and created_by = (select auth.uid())
  );
create policy "share_links: delete owner or pm" on public.share_links
  for delete to authenticated
  using (private.has_role(company_id, array['owner', 'project_manager']));

create policy "share_link_photos: select owner or pm" on public.share_link_photos
  for select to authenticated
  using (
    exists (
      select 1 from public.share_links sl
      where sl.id = share_link_photos.share_link_id
        and private.has_role(sl.company_id, array['owner', 'project_manager'])
    )
  );
-- The photo must belong to the same company as the link.
create policy "share_link_photos: insert owner or pm" on public.share_link_photos
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.share_links sl
      join public.photos p
        on p.id = share_link_photos.photo_id and p.company_id = sl.company_id
      where sl.id = share_link_photos.share_link_id
        and private.has_role(sl.company_id, array['owner', 'project_manager'])
    )
  );
create policy "share_link_photos: delete owner or pm" on public.share_link_photos
  for delete to authenticated
  using (
    exists (
      select 1 from public.share_links sl
      where sl.id = share_link_photos.share_link_id
        and private.has_role(sl.company_id, array['owner', 'project_manager'])
    )
  );

-- invites: owners (replaced by join requests in a later phase).
create policy "invites: select owner" on public.invites
  for select to authenticated
  using (private.has_role(company_id, array['owner']));
create policy "invites: insert owner" on public.invites
  for insert to authenticated
  with check (
    private.has_role(company_id, array['owner'])
    and sender_id = (select auth.uid())
  );
create policy "invites: update owner" on public.invites
  for update to authenticated
  using (private.has_role(company_id, array['owner']))
  with check (private.has_role(company_id, array['owner']));

-- project stars: personal, on projects the caller can see.
create policy "project_stars: select own" on public.project_stars
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "project_stars: insert own" on public.project_stars
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_stars.project_id and private.is_member(p.company_id)
    )
  );
create policy "project_stars: delete own" on public.project_stars
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- No longer referenced by any policy.
drop function if exists public.current_company_id();

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

drop policy if exists "storage: delete own company photos" on storage.objects;
drop policy if exists "storage: delete own company documents" on storage.objects;
drop policy if exists "storage: upload to own company" on storage.objects;
drop policy if exists "storage: upload own company documents" on storage.objects;
drop policy if exists "storage: read own company photos" on storage.objects;
drop policy if exists "storage: read own company documents" on storage.objects;

create policy "photos: read member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and private.is_member(private.storage_company(name))
  );
create policy "photos: upload member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and private.is_member(private.storage_company(name))
  );
-- Mirrors the photos table: managers delete any file, crew only files they
-- uploaded (owner_id is set by storage to the uploader).
create policy "photos: delete own or manager" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (
      private.has_role(private.storage_company(name), array['owner', 'project_manager'])
      or (
        private.is_member(private.storage_company(name))
        and owner_id = (select auth.uid())::text
      )
    )
  );

create policy "documents: read member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and private.is_member(private.storage_company(name))
  );
create policy "documents: upload owner or pm" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and private.has_role(private.storage_company(name), array['owner', 'project_manager'])
  );
create policy "documents: delete owner or pm" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and private.has_role(private.storage_company(name), array['owner', 'project_manager'])
  );

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- The caller's current company and role: the active company when they are
-- still a member of it, otherwise their oldest membership. No row means the
-- caller belongs to no company yet.
create or replace function public.get_active_membership()
returns table (company_id uuid, role text)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.company_id, m.role
  from public.memberships m
  left join public.users u on u.id = m.user_id
  where m.user_id = (select auth.uid())
  order by (m.company_id = u.active_company_id) desc nulls last, m.created_at
  limit 1;
$$;

revoke all on function public.get_active_membership() from public;
grant execute on function public.get_active_membership() to authenticated;

-- Creates a company with the caller as its owner. Until the app has a company
-- switcher, this is only for people who don't belong to a company yet.
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

  insert into public.companies (name)
  values (trimmed)
  returning id into new_company;

  insert into public.memberships (company_id, user_id, role)
  values (new_company, uid, 'owner');

  update public.users set active_company_id = new_company where id = uid;

  return new_company;
end;
$$;

-- Joins the invite's company with the invite's role (project_manager or crew,
-- never owner). Same single-company rule as create_company for now.
create or replace function public.accept_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  invite_company uuid;
  invite_role text;
  invite_sender uuid;
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

  select i.company_id, i.role, i.sender_id
  into invite_company, invite_role, invite_sender
  from public.invites i
  where i.token = invite_token
    and i.status = 'pending'
    and i.expires_at > now();

  if not found then
    raise exception 'This invite is no longer valid';
  end if;

  insert into public.memberships (company_id, user_id, role, invited_by)
  values (
    invite_company,
    uid,
    invite_role,
    (select u.id from public.users u where u.id = invite_sender)
  );

  update public.users set active_company_id = invite_company where id = uid;

  return invite_company;
end;
$$;

-- Project lists for the active company. Security invoker, so RLS applies on
-- top. is_starred is gone — stars are per user in project_stars.
drop function if exists public.find_all_projects();
drop function if exists public.find_projects_near(double precision, double precision, double precision);
drop function if exists public.get_projects_with_thumbnails();

create function public.find_all_projects()
returns table (
  id uuid, company_id uuid, name text, address text, location extensions.geography,
  created_at timestamptz, updated_at timestamptz, thumbnail_path text,
  photo_count bigint, last_photo_at timestamptz,
  project_lat double precision, project_lng double precision
)
language sql
stable
set search_path = ''
as $$
  select
    p.id, p.company_id, p.name, p.address, p.location, p.created_at, p.updated_at,
    latest_photo.storage_path,
    coalesce(photo_agg.total, 0),
    latest_photo.created_at,
    extensions.st_y(p.location::extensions.geometry)::float8,
    extensions.st_x(p.location::extensions.geometry)::float8
  from public.projects p
  left join lateral (
    select ph.storage_path, ph.created_at
    from public.photos ph
    where ph.project_id = p.id
    order by ph.created_at desc
    limit 1
  ) latest_photo on true
  left join lateral (
    select count(*)::bigint as total
    from public.photos ph
    where ph.project_id = p.id
  ) photo_agg on true
  where p.company_id = (select am.company_id from public.get_active_membership() am)
  order by p.updated_at desc;
$$;

create function public.find_projects_near(
  lat double precision, lng double precision, radius_m double precision default 100
)
returns table (
  id uuid, company_id uuid, name text, address text, location extensions.geography,
  created_at timestamptz, updated_at timestamptz, thumbnail_path text,
  photo_count bigint, last_photo_at timestamptz,
  project_lat double precision, project_lng double precision
)
language sql
stable
set search_path = ''
as $$
  select
    p.id, p.company_id, p.name, p.address, p.location, p.created_at, p.updated_at,
    latest_photo.storage_path,
    coalesce(photo_agg.total, 0),
    latest_photo.created_at,
    extensions.st_y(p.location::extensions.geometry)::float8,
    extensions.st_x(p.location::extensions.geometry)::float8
  from public.projects p
  left join lateral (
    select ph.storage_path, ph.created_at
    from public.photos ph
    where ph.project_id = p.id
    order by ph.created_at desc
    limit 1
  ) latest_photo on true
  left join lateral (
    select count(*)::bigint as total
    from public.photos ph
    where ph.project_id = p.id
  ) photo_agg on true
  where p.company_id = (select am.company_id from public.get_active_membership() am)
    and p.location is not null
    and extensions.st_dwithin(
      p.location,
      extensions.st_makepoint(lng, lat)::extensions.geography,
      radius_m
    );
$$;

create function public.get_projects_with_thumbnails()
returns table (
  id uuid, company_id uuid, name text, address text, location extensions.geography,
  created_at timestamptz, updated_at timestamptz, thumbnail_storage_path text,
  project_lat double precision, project_lng double precision
)
language sql
stable
set search_path = ''
as $$
  select
    p.id, p.company_id, p.name, p.address, p.location, p.created_at, p.updated_at,
    latest_photo.storage_path,
    extensions.st_y(p.location::extensions.geometry)::float8,
    extensions.st_x(p.location::extensions.geometry)::float8
  from public.projects p
  left join lateral (
    select ph.storage_path
    from public.photos ph
    where ph.project_id = p.id
    order by ph.created_at desc
    limit 1
  ) latest_photo on true
  where p.company_id = (select am.company_id from public.get_active_membership() am);
$$;

revoke all on function public.find_all_projects() from public;
revoke all on function public.find_projects_near(double precision, double precision, double precision) from public;
revoke all on function public.get_projects_with_thumbnails() from public;
grant execute on function public.find_all_projects() to authenticated;
grant execute on function public.find_projects_near(double precision, double precision, double precision) to authenticated;
grant execute on function public.get_projects_with_thumbnails() to authenticated;
