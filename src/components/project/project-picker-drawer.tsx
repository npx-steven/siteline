"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconMapPin,
  IconPlus,
  IconCheck,
  IconMapPinFilled,
  IconCircleCheckFilled,
  IconPhoto,
  IconSearch,
} from "@tabler/icons-react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { haversineDistance, formatRelativeTime } from "@/lib/helpers";
import type { Coordinates } from "@/types/location";

interface NearbyProject {
  id: string;
  name: string;
  address: string;
  thumbnailUrl: string | null;
  photoCount: number;
  lastPhotoAt: string | null;
  projectLat: number | null;
  projectLng: number | null;
}

type ProjectPickerDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: NearbyProject[];
  userCoords: Coordinates | null;
  capturedFile: File | null;
  onSelect: (projectId: string) => void;
  onCreateNew: () => void;
  onDiscard: () => void;
};

function ProjectPickerDrawer({
  open,
  onOpenChange,
  projects,
  userCoords,
  capturedFile,
  onSelect,
  onCreateNew,
  onDiscard,
}: ProjectPickerDrawerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Covers Drawer-internal closes (swipe, backdrop tap) — Vaul calls this
  // itself, so it never touches useEffect / the sync setState issue.
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedId(null);
      setSearchQuery("");
    }
    onOpenChange(open);
  };

  // Covers parent-driven closes: onSelect/onCreateNew typically trigger
  // setDrawerOpen(false) directly in the parent, which bypasses
  // handleOpenChange above entirely (no Vaul-internal trigger fires).
  // Reset at the point of confirmation instead, so nothing stale
  // survives to the next open regardless of how the parent closes it.
  const handleSelect = (projectId: string) => {
    setSelectedId(null);
    setSearchQuery("");
    onSelect(projectId);
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setSearchQuery("");
    onCreateNew();
  };

  const handleDiscard = () => {
    setSelectedId(null);
    setSearchQuery("");
    onDiscard();
  };

  const selectedProject =
    (selectedId ? projects.find((p) => p.id === selectedId) : null) ??
    (userCoords ? projects[0] : null);

  const isGpsMatch =
    userCoords !== null && selectedProject?.id === projects[0]?.id;

  const isSearching = !userCoords && searchQuery.trim().length > 0;

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q),
    );
  }, [projects, searchQuery]);

  // GPS flow: every proximity match (already a short list).
  // Fallback flow: all projects by default, filtered results while
  // searching. No cap — scroll handles overflow now.
  const baseList = isSearching ? filteredProjects : projects;

  // GPS flow pulls the top match into its own card above, so the list
  // excludes it. Fallback flow shows every project inline, selection
  // highlighted in place instead.
  const listProjects = userCoords
    ? baseList.filter((p) => p.id !== selectedProject?.id)
    : baseList;

  const sectionLabel = userCoords
    ? "OR ANOTHER NEARBY"
    : isSearching
      ? "SEARCH RESULTS"
      : "ALL PROJECTS";

  const getDistance = (project: NearbyProject): string => {
    if (!userCoords || !project.projectLat || !project.projectLng) return "";
    const miles = haversineDistance(
      userCoords.lat,
      userCoords.lng,
      project.projectLat,
      project.projectLng,
    );
    return `${miles.toFixed(1)} mi`;
  };

  return (
    // Not dismissible: a swipe or backdrop tap would drop the photo with no
    // trace. Leaving takes a project or an explicit Discard.
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      direction="bottom"
      dismissible={false}
    >
      <DrawerContent
        className="rounded-t-3xl bg-background flex flex-col overflow-hidden max-h-[80dvh]"
        aria-describedby={undefined}
      >
        <DrawerHeader className="items-baseline shrink-0">
          <DrawerTitle className="text-xl font-bold text-foreground">
            Save to project
          </DrawerTitle>
          <DrawerDescription>
            {userCoords
              ? "Nearby job sites based on your location"
              : "Couldn't detect your location — search or create new"}
          </DrawerDescription>
        </DrawerHeader>

        {/* Fixed zone — preview, search, GPS-match selection. Never scrolls. */}
        <div className="flex flex-col px-4 gap-4 shrink-0">
          {/* Captured photo preview */}
          <div className="flex items-center gap-3">
            {capturedFile ? (
              <Image
                src={URL.createObjectURL(capturedFile)}
                alt="Just captured"
                width={56}
                height={56}
                className="w-14 h-14 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-muted shrink-0" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                Just captured ·{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-xs text-muted-foreground flex flex-row gap-1 items-center tracking-wider">
                <IconMapPin stroke={1.5} size={14} />
                {userCoords
                  ? `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`
                  : "Location unavailable"}
              </span>
            </div>
          </div>

          {/* Search — fallback flow only */}
          {!userCoords && (
            <div className="relative">
              <IconSearch
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by name or address"
                className="pl-9 h-11 rounded-full"
              />
            </div>
          )}

          {/* Primary / selected project — GPS flow only. Fallback flow
              shows selection inline in the list instead (more rows
              visible when there's no distance data to lean on). */}
          {userCoords && selectedProject && (
            <div className="flex flex-col gap-3 p-4 rounded-2xl border border-foreground bg-foreground/5">
              <div className="flex items-center justify-between">
                <Badge>
                  {isGpsMatch ? (
                    <>
                      <IconMapPinFilled data-icon="inline-start" />
                      <span className="text-xs"> You&apos;re Here</span>
                    </>
                  ) : (
                    <>
                      <IconCircleCheckFilled data-icon="inline-start" />
                      <span> Selected</span>
                    </>
                  )}
                </Badge>
                <span className="text-xs text-foreground">
                  {getDistance(selectedProject)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {selectedProject.thumbnailUrl ? (
                  <Image
                    src={selectedProject.thumbnailUrl}
                    alt={selectedProject.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 flex rounded-lg bg-muted shrink-0 items-center justify-center">
                    <IconPhoto
                      stroke={2}
                      className="size-5 text-muted-foreground"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-semibold text-foreground">
                    {selectedProject.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedProject.photoCount}{" "}
                    {selectedProject.photoCount === 1 ? "photo" : "photos"} ·{" "}
                    {formatRelativeTime(selectedProject.lastPhotoAt)}
                  </span>
                </div>
              </div>
              <Button
                className="w-full h-12 rounded-full items-center"
                onClick={() => handleSelect(selectedProject.id)}
              >
                <IconCheck />
                Add Photo
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable zone — only the list scrolls; section label stays
            pinned to the top of it while scrolling. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          {listProjects.length > 0 && (
            <div className="flex flex-col">
              <div className="sticky top-0 z-10 bg-background pt-4 pb-2">
                <span className="text-xs font-medium text-muted-foreground tracking-wide px-1">
                  {sectionLabel}
                </span>
              </div>
              <div className="flex flex-col gap-2 pb-4">
                {listProjects.map((project) => {
                  const isSelected = project.id === selectedId;
                  const thumbnail = project.thumbnailUrl ? (
                    <Image
                      src={project.thumbnailUrl}
                      alt={project.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 flex rounded-lg bg-muted shrink-0 items-center justify-center">
                      <IconPhoto
                        stroke={2}
                        className="size-5 text-muted-foreground"
                      />
                    </div>
                  );

                  // GPS flow: plain row, distance-forward. Tapping
                  // reassigns the top card above.
                  if (userCoords) {
                    return (
                      <button
                        key={project.id}
                        onClick={() => setSelectedId(project.id)}
                        className="flex items-center justify-between p-4 rounded-xl bg-card border border-border text-left"
                      >
                        <div className="flex items-center gap-3">
                          {thumbnail}
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">
                              {project.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {project.photoCount}{" "}
                              {project.photoCount === 1 ? "photo" : "photos"}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {getDistance(project)}
                        </span>
                      </button>
                    );
                  }

                  // Fallback flow: compact toggle-select row, selection
                  // shown in place. Tapping the already-selected row
                  // clears it — a second tap deselects.
                  return (
                    <button
                      key={project.id}
                      onClick={() =>
                        setSelectedId(isSelected ? null : project.id)
                      }
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border text-left transition-colors",
                        isSelected
                          ? "border-foreground bg-foreground/5"
                          : "border-border bg-card",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {thumbnail}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-foreground">
                            {project.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {project.photoCount}{" "}
                            {project.photoCount === 1 ? "photo" : "photos"}
                          </span>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "size-5 rounded-full border flex items-center justify-center shrink-0",
                          isSelected
                            ? "bg-foreground border-foreground"
                            : "border-muted-foreground",
                        )}
                      >
                        {isSelected && (
                          <IconCheck size={12} className="text-background" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isSearching && filteredProjects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No projects match &quot;{searchQuery}&quot;
            </p>
          )}
        </div>

        {/* Fixed footer — always visible. Single button that swaps
            meaning based on selection state in the fallback flow:
            "Create New Project" by default, "Save Here" once a
            project's selected. Keeps footer height minimal, which
            matters most when the on-screen keyboard is competing
            for space during search. */}
        <div className="px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border">
          {!userCoords && selectedProject ? (
            <Button
              className="w-full h-12 rounded-full items-center"
              onClick={() => handleSelect(selectedProject.id)}
            >
              <IconCheck />
              Save Here
            </Button>
          ) : (
            <button
              onClick={handleCreateNew}
              className="flex items-center justify-center gap-2 p-4 rounded-full border border-muted-foreground text-sm font-medium text-foreground w-full"
            >
              <IconPlus size={16} />
              Create New Project
            </button>
          )}
          <Button
            variant="ghost"
            onClick={handleDiscard}
            className="mt-1 w-full rounded-full text-muted-foreground"
          >
            Discard Photo
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default ProjectPickerDrawer;
