import React from "react";

import { IconPhoto, IconFileText, IconCalendar } from "@tabler/icons-react";
import { formatDate } from "@/lib/helpers";

type ProjectSettingsStatsProps = {
  photoCount: number;
  docCount: number;
  created_at: string;
};

function ProjectSettingsStats({
  photoCount,
  docCount,
  created_at,
}: ProjectSettingsStatsProps) {
  const formattedDate = formatDate(new Date(created_at));

  const stats = [
    { icon: IconPhoto, label: "Photos", stat: photoCount },
    { icon: IconFileText, label: "Documents", stat: docCount },
    { icon: IconCalendar, label: "Created", stat: formattedDate },
  ];

  return (
    <div className="p-4 ">
      <div className="bg-card border border-border w-full rounded-2xl flex flex-col divide-y divide-border px-4">
        {stats.map(({ icon: Icon, label, stat }) => (
          <div
            key={label}
            className="flex flex-row items-center justify-between py-3"
          >
            <div className="flex flex-row gap-2 items-center text-foreground">
              <Icon stroke={1.5} size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {stat}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectSettingsStats;
