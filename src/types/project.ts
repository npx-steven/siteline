import { Project } from "./db";

export type ProjectWithThumbnail = Pick<
  Project,
  "id" | "name" | "address" | "created_at" | "is_starred"
> & {
  thumbnail_url: string | null;
  project_lat: number | null;
  project_lng: number | null;
};

export type ProjectSettings = Pick<
  Project,
  "id" | "name" | "address" | "created_at" | "is_starred"
> & {
  photoCount: number;
  docCount: number;
};
