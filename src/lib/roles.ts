import type { Role } from "@/types/db";

// Display names for roles. The stored value stays project_manager (it's
// referenced by RLS policies and RPCs); only what people see is "Manager".
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  project_manager: "Manager",
  crew: "Crew",
};

// Roles that can be granted through a join link or request. Ownership is only
// ever transferred, never granted on join.
export type GrantableRole = Exclude<Role, "owner">;

export const GRANTABLE_ROLES: readonly GrantableRole[] = [
  "crew",
  "project_manager",
];
