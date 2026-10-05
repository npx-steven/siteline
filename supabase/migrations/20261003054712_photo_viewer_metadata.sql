alter table public.photos
  add column if not exists captured_at timestamptz,
  add column if not exists width integer check (width > 0),
  add column if not exists height integer check (height > 0),
  add column if not exists location_source text
    check (location_source in ('exif', 'device')),
  add column if not exists note text check (char_length(note) <= 1000);

update public.photos
set location_source = 'device'
where location is not null and location_source is null;

revoke update on public.photos from anon, authenticated;
grant update (note) on public.photos to authenticated;

create policy "photos: update note member" on public.photos
  for update
  using (
    exists (
      select 1
      from projects p
      join users u on u.id = auth.uid()
      where p.id = photos.project_id and p.company_id = u.company_id
    )
  )
  with check (
    exists (
      select 1
      from projects p
      join users u on u.id = auth.uid()
      where p.id = photos.project_id and p.company_id = u.company_id
    )
  );
