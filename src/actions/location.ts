"use server";

import type { Coordinates } from "@/types/location";
import type { CreateProjectFormValues } from "@/lib/validators/project";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/supabase/storage";
import { cookies } from "next/headers";

interface MapboxAddressContext {
  address_number?: string;
  street_name?: string;
  name?: string;
}

interface MapboxContext {
  address?: MapboxAddressContext;
  street?: { name?: string };
  place?: { name?: string };
  region?: { name?: string; region_code?: string };
  postcode?: { name?: string };
}

interface MapboxFeature {
  properties: {
    feature_type: string;
    full_address: string;
    context: MapboxContext;
  };
}

interface MapboxResponse {
  type: "FeatureCollection";
  features: MapboxFeature[];
}

type PrefillFields = Pick<
  CreateProjectFormValues,
  "address_line_1" | "city" | "state" | "zip_code"
>;

type AddressLookupResult =
  | { success: true; address: PrefillFields }
  | { success: false; error: string };

export async function getAddressFromCoordsAction(
  coords: Coordinates,
): Promise<AddressLookupResult> {
  const { lat, lng } = coords;

  const params = new URLSearchParams({
    longitude: lng.toString(),
    latitude: lat.toString(),
    types: "address",
    access_token: process.env.MAPBOX_ACCESS_TOKEN ?? "",
  });

  try {
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?${params}`,
    );

    if (!response.ok) {
      return { success: false, error: `Mapbox returned ${response.status}` };
    }

    const data: MapboxResponse = await response.json();
    const feature = data.features[0];

    if (!feature) {
      return { success: false, error: "No address found for this location" };
    }

    const { address, street, place, region, postcode } =
      feature.properties.context;

    const addressLine1 =
      address?.name ??
      [address?.address_number, address?.street_name ?? street?.name]
        .filter(Boolean)
        .join(" ");

    return {
      success: true,
      address: {
        address_line_1: addressLine1 || "",
        city: place?.name ?? "",
        state: region?.region_code ?? region?.name ?? "",
        zip_code: postcode?.name ?? "",
      },
    };
  } catch {
    return { success: false, error: "Failed to reach geocoding service" };
  }
}

export async function findProjectsNearAction(coords: Coordinates) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.rpc("find_projects_near", {
    lat: coords.lat,
    lng: coords.lng,
    radius_m: 100,
  });

  if (error) return { data: null, error: error.message };
  if (!data) return { data: [], error: null };

  const rows = data as {
    id: string;
    name: string;
    address: string;
    thumbnail_path: string | null;
    photo_count: number;
    last_photo_at: string | null;
    project_lat: number;
    project_lng: number;
  }[];
  const thumbnailUrls = await signPhotoUrls(
    supabase,
    rows.map((row) => row.thumbnail_path),
  );

  const resolved = rows.map((row) => {
    const thumbnailUrl = row.thumbnail_path
      ? (thumbnailUrls.get(row.thumbnail_path) ?? null)
      : null;

    return {
      id: row.id,
      name: row.name,
      address: row.address,
      thumbnailUrl,
      photoCount: row.photo_count,
      lastPhotoAt: row.last_photo_at,
      projectLat: row.project_lat,
      projectLng: row.project_lng,
    };
  });

  return { data: resolved, error: null };
}

export async function forwardGeocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    q: address,
    access_token: process.env.MAPBOX_ACCESS_TOKEN ?? "",
    limit: "1",
    country: "us",
  });

  try {
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/forward?${params}`,
    );

    if (!response.ok) return null;

    const data = await response.json();
    const feature = data.features?.[0];

    if (!feature) return null;

    // Only trust address-level results with at least a "low" confidence match
    // Reject postcodes, places, or locality-level fallbacks
    if (feature.properties.feature_type !== "address") return null;
    if (feature.properties.match_code?.confidence === "not_applicable")
      return null;

    const [lng, lat] = feature.geometry.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function getAllProjectsAction() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.rpc("find_all_projects");

  if (error) return { data: null, error: error.message };
  if (!data) return { data: [], error: null };

  const rows = data as {
    id: string;
    name: string;
    address: string;
    thumbnail_path: string | null;
    photo_count: number;
    last_photo_at: string | null;
    project_lat: number | null;
    project_lng: number | null;
  }[];
  const thumbnailUrls = await signPhotoUrls(
    supabase,
    rows.map((row) => row.thumbnail_path),
  );

  const resolved = rows.map((row) => {
    const thumbnailUrl = row.thumbnail_path
      ? (thumbnailUrls.get(row.thumbnail_path) ?? null)
      : null;

    return {
      id: row.id,
      name: row.name,
      address: row.address,
      thumbnailUrl,
      photoCount: row.photo_count,
      lastPhotoAt: row.last_photo_at,
      projectLat: row.project_lat,
      projectLng: row.project_lng,
    };
  });

  return { data: resolved, error: null };
}
