"use server";

import { SHARE_LINK_TTL_DAYS } from "@/lib/helpers";
import { createClient } from "@/lib/supabase/server";
import { ShareViewType } from "@/types/db";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getActiveMembership } from "@/lib/membership";
import { can } from "@/lib/permissions";

type GenerateShareLinkResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

export async function generateShareLink(
  projectId: string,
  photoIds: string[],
  viewType: ShareViewType,
): Promise<GenerateShareLinkResult> {
  // Return false when photo id array is empty
  if (photoIds.length === 0) {
    return { ok: false, error: "No photos selected" };
  }

  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  // Check if its a valid user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not Authenticated" };
  }

  const membership = await getActiveMembership(supabase);
  if (!membership || !can.sharePhotos(membership.role)) {
    return { ok: false, error: "Only owners and project managers can share" };
  }

  //Confirm the project is connect to the user
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return { ok: false, error: "Project not found" };
  }

  if (projectError) {
    return { ok: false, error: projectError };
  }

  //Confirm every photo id belongs to this project
  const { data: validPhotos, error: photosError } = await supabase
    .from("photos")
    .select("id")
    .eq("project_id", projectId)
    .in("id", photoIds);

  if (photosError) {
    return { ok: false, error: "Could not verify photos." };
  }

  //Confirm every photo is valid by cross checking the length of valid photos with photo id array
  if (!validPhotos || validPhotos.length !== photoIds.length) {
    return { ok: false, error: "One or more photos are invalid" };
  }

  // Create the shareable token
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(
    Date.now() + SHARE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Insert the token and view type into the table
  const { data: link, error: linkError } = await supabase
    .from("share_links")
    .insert({
      token,
      project_id: projectId,
      created_by: user.id,
      view_type: viewType,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (linkError || !link) {
    return { ok: false, error: "Could not create share link." };
  }

  // Insert the join rows (connect the share links -> share photo -> photos)
  const joinRows = validPhotos.map((photo) => ({
    share_link_id: link.id,
    photo_id: photo.id,
  }));

  const { error: joinError } = await supabase
    .from("share_link_photos")
    .insert(joinRows);

  if (joinError) {
    // Roll back the parent link so a photo-less share token never escapes.
    await supabase.from("share_links").delete().eq("id", link.id);
    return { ok: false, error: "Could not attach photos to link." };
  }

  return { ok: true, token };
}
