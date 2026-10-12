"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAuthUser } from "@/lib/auth";

// Stars are per user, held in project_stars — not a shared flag on the project.
// RLS ("project_stars: insert own" / "delete own") is the whole authorization
// story: it confirms the star is yours and the project is in your company, so
// no role check is needed and every member including crew can star.
//
// Throws on failure by design — callers use the rejection to revert their
// optimistic star state (see project-card.tsx, project-settings-actions.tsx).
export async function toggleProjectStarredAction(
  projectId: string,
  isStarred: boolean,
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated");

  if (isStarred) {
    // upsert, not insert — a double tap must not fail on the primary key. An
    // RLS rejection here raises 42501, so it surfaces as a real error.
    const { error } = await supabase
      .from("project_stars")
      .upsert({ user_id: user.id, project_id: projectId });

    if (error) throw new Error(error.message);
  } else {
    // Deleting a star that isn't there is already the desired end state, so a
    // zero-row delete needs no special handling.
    const { error } = await supabase
      .from("project_stars")
      .delete()
      .eq("user_id", user.id)
      .eq("project_id", projectId);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}/settings`);
}
