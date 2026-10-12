import type { Role } from "@/types/db";

// What each role may do. This mirrors the RLS policies and RPCs in
// supabase/migrations (tenant_memberships, join_requests,
// managers_can_invite, member_management) — the database enforces it; the
// app uses it to hide
// controls and return clear errors. Change both together.
//
//                    owner  manager  crew
//   edit company       ✓
//   change roles,      ✓
//     remove members
//   invite, review     ✓       ✓
//     join requests
//   create project     ✓       ✓       ✓
//   edit/delete proj.  ✓       ✓
//   upload/del. docs   ✓       ✓
//   share photos       ✓       ✓
//   delete photo       ✓       ✓     own only

const MANAGERS: readonly Role[] = ["owner", "project_manager"];

export const can = {
  editCompany: (role: Role) => role === "owner",
  manageMembers: (role: Role) => role === "owner",
  manageInvites: (role: Role) => MANAGERS.includes(role),
  manageProject: (role: Role) => MANAGERS.includes(role),
  manageDocuments: (role: Role) => MANAGERS.includes(role),
  sharePhotos: (role: Role) => MANAGERS.includes(role),
  deleteAnyPhoto: (role: Role) => MANAGERS.includes(role),
};
