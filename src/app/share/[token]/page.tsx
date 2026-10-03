import SharePageClient from "@/components/share/share-page-client";
import { SHARE_LINK_TTL_DAYS } from "@/lib/helpers";
import { parsePostgisPoint, toViewerPhoto } from "@/lib/photos";
import { createServiceClient } from "@/lib/supabase/server";
import { SharedPhoto } from "@/types/db";
import { IconClockOff } from "@tabler/icons-react";
import { notFound } from "next/navigation";
import React from "react";

type SharePageProps = {
  params: Promise<{ token: string }>;
};

async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const supabase = createServiceClient();

  // Resolve the token → share link. This is the auth gate: no row = 404.
  const { data: shareLink, error: shareLinkError } = await supabase
    .from("share_links")
    .select("id, project_id, view_type, expires_at")
    .eq("token", token)
    .single();

  if (shareLinkError || !shareLink) {
    notFound();
  }

  // Expired links get a plain explanation rather than a 404 — the recipient is
  // a client who was legitimately sent this and needs to know to ask again.
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card">
          <IconClockOff stroke={1.5} className="size-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          This link has expired
        </h1>
        <p className="mt-1 max-w-xs text-pretty text-sm text-muted-foreground">
          Photo links stay live for {SHARE_LINK_TTL_DAYS} days. Ask whoever sent
          it to share a fresh one.
        </p>
      </main>
    );
  }

  // Project header info + the owning company name (FK embed, aliased for readability).
  const { data: project } = await supabase
    .from("projects")
    .select("name, address, location, company:companies(name)")
    .eq("id", shareLink.project_id)
    .single();

  if (!project) {
    notFound();
  }

  // Fetch photos THROUGH the join, scoped to this link — never by project_id.
  const { data: grantedPhotoRows, error: grantedPhotosError } = await supabase
    .from("share_link_photos")
    .select(
      "photos(id, storage_path, created_at, captured_at, uploaded_by_name, location, location_source, size_bytes, width, height, note)",
    )
    .eq("share_link_id", shareLink.id);

  if (grantedPhotosError) {
    notFound();
  }

  // Unwrap the nested embed into a flat list of photo rows.
  const grantedPhotos = (grantedPhotoRows ?? [])
    .flatMap((row) => row.photos)
    .filter((photo): photo is NonNullable<typeof photo> => photo !== null);

  // Resolve storage paths into public URLs (photos live in a public bucket).
  const sharedPhotos: SharedPhoto[] = grantedPhotos.map((photo) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from("photos").getPublicUrl(photo.storage_path);
    return toViewerPhoto(photo, publicUrl);
  });

  const company = Array.isArray(project.company)
    ? project.company[0]
    : project.company;

  return (
    <SharePageClient
      companyName={company?.name ?? "Siteline"}
      projectName={project.name}
      projectAddress={project.address}
      siteLocation={parsePostgisPoint(project.location)}
      viewType={shareLink.view_type}
      sharedPhotos={sharedPhotos}
      token={token}
    />
  );
}

export default SharePage;
