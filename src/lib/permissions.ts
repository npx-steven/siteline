import type { Role } from "@/types/db";

// What each role may do. This mirrors the RLS policies in
// supabase/migrations/20261005055639_tenant_memberships.sql — the database
// enforces it; the app uses it to hide controls and return clear errors.
// Change both together.
//
//                    owner  project_manager  crew
//   edit company       ✓
//   manage invites     ✓
//   create project     ✓          ✓           ✓
//   edit/delete proj.  ✓          ✓
//   upload/del. docs   ✓          ✓
//   share photos       ✓          ✓
//   delete photo       ✓          ✓        own only

const MANAGERS: readonly Role[] = ["owner", "project_manager"];

export const can = {
  editCompany: (role: Role) => role === "owner",
  manageInvites: (role: Role) => role === "owner",
  manageProject: (role: Role) => MANAGERS.includes(role),
  manageDocuments: (role: Role) => MANAGERS.includes(role),
  sharePhotos: (role: Role) => MANAGERS.includes(role),
  deleteAnyPhoto: (role: Role) => MANAGERS.includes(role),
};
