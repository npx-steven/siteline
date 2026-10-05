-- Remove schema the app never reads or maintains.
--
-- users.gps_autofile   read by the account page but never shown or acted on;
--                      GPS filing always runs, with no per-user toggle.
-- companies.updated_at no trigger maintained it and nothing read it.
-- projects.updated_at  no trigger maintained it, so it always equalled
--                      created_at; the project picker now orders by
--                      created_at directly.
-- get_projects_with_thumbnails()
--                      a subset of find_all_projects(); the projects page now
--                      calls find_all_projects() too.
--
-- The project RPCs also stop returning columns no caller reads
-- (company_id, location, updated_at).

alter table public.users drop column gps_autofile;
alter table public.companies drop column updated_at;

drop function public.get_projects_with_thumbnails();
drop function public.find_all_projects();
drop function public.find_projects_near(double precision, double precision, double precision);

alter table public.projects drop column updated_at;

create function public.find_all_projects()
returns table (
  id uuid, name text, address text, created_at timestamptz,
  thumbnail_path text, photo_count bigint, last_photo_at timestamptz,
  project_lat double precision, project_lng double precision
)
language sql
stable
set search_path = ''
as $$
  select
    p.id, p.name, p.address, p.created_at,
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
  order by p.created_at desc;
$$;

create function public.find_projects_near(
  lat double precision, lng double precision, radius_m double precision default 100
)
returns table (
  id uuid, name text, address text, created_at timestamptz,
  thumbnail_path text, photo_count bigint, last_photo_at timestamptz,
  project_lat double precision, project_lng double precision
)
language sql
stable
set search_path = ''
as $$
  select
    p.id, p.name, p.address, p.created_at,
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

revoke all on function public.find_all_projects() from public, anon;
revoke all on function public.find_projects_near(double precision, double precision, double precision) from public, anon;
grant execute on function public.find_all_projects() to authenticated;
grant execute on function public.find_projects_near(double precision, double precision, double precision) to authenticated;
