import type { Role } from "@/types/db";

// Display names for roles. The stored value stays project_manager (it's
// referenced by RLS policies and RPCs); only what people see is "Manager".
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  project_manager: "Manager",
  crew: "Crew",
};

// One-line summaries for the role picker. Keep in step with lib/permissions.
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full control of the company, its team and projects",
  project_manager: "Manages projects, invites and approves new teammates",
  crew: "Takes photos and sees the company's projects",
};

// Roles that can be granted through a join link or request. Ownership is only
// ever transferred, never granted on join.
export type GrantableRole = Exclude<Role, "owner">;

export const GRANTABLE_ROLES: readonly GrantableRole[] = [
  "crew",
  "project_manager",
];
