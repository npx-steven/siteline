"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getAuthUser } from "./auth";
import {
  createProjectSchema,
  editProjectSchema,
} from "@/lib/validators/project";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { forwardGeocodeAddress } from "./location";
import { getActiveMembership } from "@/lib/membership";
import { can } from "@/lib/permissions";

export async function createProjectAction(
  formData: FormData,
): Promise<{ error: string | null; projectId: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch auth user
  const user = await getAuthUser();
  if (!user) {
    return { error: "Not authenticated ", projectId: null };
  }

  // New projects go to the active company. RLS re-checks membership.
  const membership = await getActiveMembership(supabase);
  if (!membership) {
    return { error: "No company found", projectId: null };
  }

  // Parse raw data
  const rawData = {
    project_name: formData.get("project_name") ?? "",
    address_line_1: formData.get("address_line_1") ?? "",
    address_line_2: formData.get("address_line_2") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    zip_code: formData.get("zip_code") ?? "",
  };

  const parseData = createProjectSchema.safeParse(rawData);
  if (!parseData.success) {
    return { error: parseData.error.issues[0].message, projectId: null };
  }

  const projectName =
    parseData.data.project_name || parseData.data.address_line_1;

  const { address_line_1, address_line_2, city, state, zip_code } =
    parseData.data;

  const address = `${address_line_1}${address_line_2 ? `, ${address_line_2}` : ""}, ${city}, ${state} ${zip_code}`;

  // Forward geocode the submitted address — always reflects the actual
  // job site location, not the device's GPS at form-open time
  const geocoded = await forwardGeocodeAddress(address);
  const location = geocoded ? `POINT(${geocoded.lng} ${geocoded.lat})` : null;

  // Insert project into the project table
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: projectName,
      company_id: membership.companyId,
      address: address,
      ...(location ? { location } : {}),
    })
    .select()
    .single();

  if (projectError) {
    return { error: "Failed to create project", projectId: null };
  }

  return { error: null, projectId: project.id };
}

export async function editProjectAction(
  id: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const membership = await getActiveMembership(supabase);
  if (!membership) return { error: "No company found" };
  if (!can.manageProject(membership.role))
    return { error: "Only owners and project managers can edit this project" };

  const parsed = editProjectSchema.safeParse({
    project_name: formData.get("project_name") ?? "",
    address_line_1: formData.get("address_line_1") ?? "",
    address_line_2: formData.get("address_line_2") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    zip_code: formData.get("zip_code") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { address_line_1, address_line_2, city, state, zip_code } = parsed.data;
  const projectName = parsed.data.project_name || address_line_1;
  const address = `${address_line_1}${address_line_2 ? `, ${address_line_2}` : ""}, ${city}, ${state} ${zip_code}`;

  const geocoded = await forwardGeocodeAddress(address);
  const location = geocoded ? `POINT(${geocoded.lng} ${geocoded.lat})` : null;

  const { error: projectError } = await supabase
    .from("projects")
    .update({
      name: projectName,
      address,
      ...(location ? { location } : {}),
    })
    .eq("id", id)
    .eq("company_id", membership.companyId);

  if (projectError) return { error: "Failed to update project" };

  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/settings`);
  revalidatePath("/projects");

  return { error: null };
}

export async function deleteProjectAction(
  id: string,
): Promise<{ error: string } | void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const membership = await getActiveMembership(supabase);
  if (!membership) return { error: "No company found" };
  if (!can.manageProject(membership.role))
    return { error: "Only owners and project managers can delete a project" };

  // Scope the lookup to the caller's company. A bare id lookup would let any
  // authenticated user wipe another company's project and its storage.
  const { data: project, error } = await supabase
    .from("projects")
    .select("company_id")
    .eq("id", id)
    .eq("company_id", membership.companyId)
    .maybeSingle();

  if (error) {
    return { error: `Database: ${error.message}` };
  }

  if (!project) {
    return { error: "Project not found" };
  }

  const folderPath = `${project.company_id}/${id}`;

  // Delete the row FIRST, and confirm it actually went. An RLS-blocked DELETE
  // affects zero rows without erroring, so wiping storage up front risks
  // stripping every file while the project itself survives.
  const { data: deletedProject, error: deleteError } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("company_id", membership.companyId)
    .select("id");

  if (deleteError) {
    return { error: `Failed to delete project: ${deleteError.message}` };
  }

  if (!deletedProject || deletedProject.length === 0) {
    return { error: "You don't have permission to delete this project" };
  }

  // Row (and its cascaded photo/document rows) are gone — now clean the bucket
  // folders. Failures here leave unreferenced bytes, which is recoverable and
  // must not be reported as a failed delete.
  for (const bucket of ["photos", "documents"] as const) {
    const { data: files } = await supabase.storage.from(bucket).list(folderPath);
    if (files && files.length > 0) {
      await supabase.storage
        .from(bucket)
        .remove(files.map((file) => `${folderPath}/${file.name}`));
    }
  }

  redirect("/projects");
}
