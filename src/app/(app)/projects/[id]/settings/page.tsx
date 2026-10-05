import ProjectDirectionButton from "@/components/project/settings/project-directions-button";
import ProjectSettingsActions from "@/components/project/settings/project-settings-actions";
import ProjectSettingsDangerZone from "@/components/project/settings/project-settings-danger-zone";
import ProjectSettingsHeader from "@/components/project/settings/project-settings-header";
import ProjectSettingsStats from "@/components/project/settings/project-settings-stats";
import { getAuthUser } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/membership";
import { can } from "@/lib/permissions";
import { ProjectSettings } from "@/types/project";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

type ProjectSettingsProps = {
  params: Promise<{ id: string }>;
};

async function ProjectSettingsPage({ params }: ProjectSettingsProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) redirect("/");

  // Role decides whether the destructive actions render at all — the actions
  // themselves re-check server-side, this just avoids showing dead buttons.
  const [{ data, error }, membership, { data: star }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          `id, name, address, created_at, photos(count) , documents(count)`,
        )
        .eq("id", id)
        .single(),
      getActiveMembership(supabase),
      // Per-user star; RLS restricts this to the current user's own row.
      supabase
        .from("project_stars")
        .select("project_id")
        .eq("project_id", id)
        .maybeSingle(),
    ]);

  if (error) {
    console.error(error);
    notFound();
  }

  if (!data) {
    notFound();
  }

  const canManage = membership ? can.manageProject(membership.role) : false;

  const projectSettings: ProjectSettings = {
    id: data.id,
    name: data.name,
    address: data.address,
    created_at: data.created_at,
    is_starred: star !== null,
    photoCount: data.photos[0].count,
    docCount: data.documents[0].count,
  };

  return (
    <div>
      <div>
        <ProjectSettingsHeader
          id={projectSettings.id}
          name={projectSettings.name}
          address={projectSettings.address}
        />
      </div>
      <div>
        <ProjectSettingsActions
          id={projectSettings.id}
          name={projectSettings.name}
          address={projectSettings.address}
          isStarred={projectSettings.is_starred}
          canEdit={canManage}
        />
      </div>
      <div>
        <ProjectDirectionButton address={projectSettings.address} />
      </div>
      <div>
        <ProjectSettingsStats
          photoCount={projectSettings.photoCount}
          docCount={projectSettings.docCount}
          created_at={projectSettings.created_at}
        />
      </div>
      {canManage && (
        <div className="mt-6">
          <ProjectSettingsDangerZone id={projectSettings.id} />
        </div>
      )}
    </div>
  );
}

export default ProjectSettingsPage;
