import ProjectShell from "@/components/project/project-shell";
import { createClient } from "@/lib/supabase/server";
import { parsePostgisPoint, toViewerPhoto } from "@/lib/photos";
import { Photo } from "@/types/db";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

type ProjectProps = {
  params: Promise<{ id: string }>;
};

async function ProjectPage({ params }: ProjectProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: project } = await supabase
    .from("projects")
    .select("*, photos(*), documents(*)")
    .eq("id", id)
    .single();

  if (!project) {
    notFound();
  }

  const sortProjectsByRecent = project.photos.sort((a: Photo, b: Photo) => {
    return b.created_at > a.created_at ? 1 : -1;
  });

  const coverPhoto = sortProjectsByRecent[0]?.storage_path ?? null;
  const coverPhotoUrl = coverPhoto
    ? supabase.storage.from("photos").getPublicUrl(coverPhoto).data.publicUrl
    : null;

  const photos = sortProjectsByRecent.map((photo: Photo) =>
    toViewerPhoto(
      photo,
      supabase.storage.from("photos").getPublicUrl(photo.storage_path).data
        .publicUrl,
    ),
  );

  return (
    <ProjectShell
      projectId={id}
      projectName={project.name}
      projectAddress={project.address}
      siteLocation={parsePostgisPoint(project.location)}
      coverPhotoUrl={coverPhotoUrl}
      photos={photos}
      documents={project.documents}
    />
  );
}

export default ProjectPage;
