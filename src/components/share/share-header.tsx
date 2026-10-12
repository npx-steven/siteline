"use client";

import { useState } from "react";
import { companyFirstTwoInitials } from "@/lib/helpers";
import { IconLock, IconMapPin, IconDownload } from "@tabler/icons-react";
import { Button } from "../ui/button";
import Image from "next/image";

type ShareHeaderProps = {
  companyName: string;
  projectName: string;
  projectAddress: string;
  dateRange: string;
  photoCount: number;
  token: string;
};

function ShareHeader({
  companyName,
  projectName,
  projectAddress,
  dateRange,
  photoCount,
  token,
}: ShareHeaderProps) {
  const companyInitials = companyFirstTwoInitials(companyName);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/share/${token}/download`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "photos.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      {/*Top Secure Bar*/}
      <div className="flex flex-row items-center justify-between p-4">
        {/*Initials and Company Name*/}
        <div className="flex flex-row items-center gap-2">
          <div className="flex items-center justify-center bg-foreground text-background rounded-lg w-10 h-10 text-sm font-bold">
            {companyInitials}
          </div>
          <div className="flex flex-col items-start">
            <div className="text-sm text-foreground font-semibold tracking-wide leading-tight">
              {companyName}
            </div>
            <div className="flex flex-row items-center gap-1 text-muted-foreground leading-tight">
              <IconLock stroke={2} height={12} width={12} />
              <span className="text-[11px]">Secure Client Link</span>
            </div>
          </div>
        </div>
        {/*Siteline Logo*/}
        <div className="overflow-hidden rounded-sm w-6 h-6">
          <Image
            src="/icons/siteline-icon-1024.png"
            width={32}
            height={32}
            alt="Siteline logo"
            className="object-cover w-full h-full"
          />
        </div>
      </div>
      {/* Project Info */}
      <div className="flex flex-col gap-2 p-4">
        <span className="text-[11px] text-muted-foreground font-medium">
          {photoCount} {photoCount === 1 ? "PHOTO" : "PHOTOS"} SHARED WITH YOU
        </span>
        <span className="text-3xl md:text-4xl lg:text-5xl tracking-normal font-bold text-foreground">
          {projectName}
        </span>
        <div className="flex flex-row text-sm items-center text-muted-foreground gap-1 font-medium">
          <IconMapPin stroke={2} height={16} width={16} />
          <span>{projectAddress}</span>
        </div>
        <div className="flex flex-row items-center justify-between text-xs font-medium">
          <span>{dateRange}</span>
          <Button
            variant="link"
            className="text-xs font-medium"
            onClick={handleDownloadAll}
            disabled={downloading}
          >
            <IconDownload stroke={2} width={12} height={12} />
            {downloading ? "Preparing…" : "Download All"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ShareHeader;
