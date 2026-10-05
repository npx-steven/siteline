-- Tenant model: contract step.
--
-- Apply only after the code that reads memberships is deployed. Removes the
-- single-company columns that 20261005055639_tenant_memberships replaced, so
-- nothing can drift back to reading them.

drop index if exists public.users_company_id_idx;
alter table public.users drop column company_id;
alter table public.users drop column role;

-- Ownership lives in memberships.role. This FK also blocked deleting an
-- owner's account (ON DELETE RESTRICT).
alter table public.companies drop column owner_id;

-- Replaced by per-user project_stars.
alter table public.projects drop column is_starred;

-- Debug helpers that are no longer called and were flagged by the advisor.
drop function if exists public.get_jwt_claims();
drop function if exists public.get_current_role();
drop function if exists public.get_auth_role();
