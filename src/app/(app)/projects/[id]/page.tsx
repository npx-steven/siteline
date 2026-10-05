import ProjectShell from "@/components/project/project-shell";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/supabase/storage";
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

  const photoUrls = await signPhotoUrls(
    supabase,
    sortProjectsByRecent.map((photo: Photo) => photo.storage_path),
  );

  const coverPhoto = sortProjectsByRecent[0]?.storage_path ?? null;
  const coverPhotoUrl = coverPhoto ? (photoUrls.get(coverPhoto) ?? null) : null;

  // A photo whose file failed to sign is left out rather than shown broken.
  const photos = sortProjectsByRecent.flatMap((photo: Photo) => {
    const url = photoUrls.get(photo.storage_path);
    return url ? [toViewerPhoto(photo, url)] : [];
  });

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
