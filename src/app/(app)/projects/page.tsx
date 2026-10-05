import { getAuthUser } from "@/actions/auth";
import ProjectsView from "@/components/project/projects-view";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/supabase/storage";
import { ProjectWithThumbnail } from "@/types/project";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

type RawProjectRow = {
  id: string;
  company_id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number } | null;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_storage_path: string | null;
  project_lat: number | null;
  project_lng: number | null;
};
async function ProjectsPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) redirect("/");

  const [{ data, error }, { data: userData }, { data: stars }] =
    await Promise.all([
      supabase.rpc("get_projects_with_thumbnails"),
      // Must filter by id: the "users: select same company" policy returns
      // every teammate, so an unfiltered .single() errors once a company has
      // more than one member.
      supabase.from("users").select("full_name").eq("id", user.id).single(),
      // Stars are per user and RLS scopes this to auth.uid(), so it needs no
      // filter of its own. Kept as a separate query rather than a join inside
      // get_projects_with_thumbnails so the RPC stays untouched.
      supabase.from("project_stars").select("project_id"),
    ]);

  if (error) throw error;

  const firstName = userData?.full_name?.split(" ")[0] ?? "";

  const rows = (data ?? []) as RawProjectRow[];
  const thumbnailUrls = await signPhotoUrls(
    supabase,
    rows.map((row) => row.thumbnail_storage_path),
  );

  const starredProjectIds = new Set(
    ((stars ?? []) as { project_id: string }[]).map((row) => row.project_id),
  );

  const projects: ProjectWithThumbnail[] = rows.map((row) => ({
    id: row.id,
    company_id: row.company_id,
    name: row.name,
    address: row.address,
    location: row.location,
    // Deliberately ignores row.is_starred — the RPC still returns the old
    // company-wide column, which project_stars replaced.
    is_starred: starredProjectIds.has(row.id),
    created_at: row.created_at,
    updated_at: row.updated_at,
    thumbnail_url: row.thumbnail_storage_path
      ? (thumbnailUrls.get(row.thumbnail_storage_path) ?? null)
      : null,
    project_lat: row.project_lat,
    project_lng: row.project_lng,
  }));

  return <ProjectsView projects={projects} firstName={firstName} />;
}

export default ProjectsPage;
