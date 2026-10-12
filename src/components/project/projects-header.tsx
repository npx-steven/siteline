import { getGreeting } from "@/lib/helpers";
import { IconMapPin, IconFolder } from "@tabler/icons-react";

type ProjectsHeaderProps = {
  firstName: string;
  nearbyCount: number | null;
  totalCount: number;
};

function ProjectsHeader({
  firstName,
  nearbyCount,
  totalCount,
}: ProjectsHeaderProps) {
  const showNearby = nearbyCount != null && nearbyCount > 0;

  const subtext = showNearby
    ? `${nearbyCount} ${nearbyCount === 1 ? "site" : "sites"} nearby`
    : `${totalCount} ${totalCount === 1 ? "project" : "projects"}`;

  const Icon = showNearby ? IconMapPin : IconFolder;

  return (
    <div className="flex flex-col px-4">
      <h1 className="text-2xl font-bold text-foreground">
        {getGreeting()}
        {firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="flex items-center gap-1 font-medium text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {subtext}
      </p>
    </div>
  );
}

export default ProjectsHeader;
