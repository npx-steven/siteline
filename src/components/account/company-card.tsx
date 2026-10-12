import { userInitials } from "@/lib/helpers";
import { can } from "@/lib/permissions";
import { Company } from "@/types/account";
import { Role } from "@/types/db";
import {
  IconBuilding,
  IconEdit,
  IconLicense,
  IconPlus,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

type CompanyCardProps = {
  company: Company;
  role: Role;
  memberCount: number;
  memberNames: string[];
  requestCount: number;
  onEdit: () => void;
  onInvite: () => void;
};

const AVATAR_STACK_SIZE = 4;

function CompanyCard({
  company,
  role,
  memberCount,
  memberNames,
  requestCount,
  onEdit,
  onInvite,
}: CompanyCardProps) {
  const canEdit = can.editCompany(role);
  const canInvite = can.manageInvites(role);

  return (
    <main className="flex flex-col bg-card border border-muted-foreground/20 rounded-3xl p-4 mt-8">
      <div className="flex flex-row items-start justify-between gap-3 ">
        <div className="flex flex-1 flex-row items-center gap-3 min-w-0">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <IconBuilding className="size-6" />
          </div>
          <div className="flex w-0 flex-1 flex-col items-start justify-center overflow-hidden">
            <p className="w-full text-base tracking-tight font-bold truncate capitalize">
              {company.name}
            </p>
            {company.license_number ? (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <IconLicense className="size-4" />
                <span>{company.license_number}</span>
              </div>
            ) : (
              canEdit && (
                <Button
                  variant="outline"
                  size="xs"
                  className="rounded-full bg-card border-dashed border-foreground/30 mt-1 h-5 px-1.5 gap-1 text-[10px] [&_svg]:size-2.5"
                  onClick={onEdit}
                >
                  <IconPlus />
                  Add license number
                </Button>
              )
            )}
          </div>
        </div>

        {canEdit && (
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full shrink-0"
            onClick={onEdit}
            aria-label="Edit company"
          >
            <IconEdit className="size-4" />
          </Button>
        )}
      </div>

      <Separator className="my-4" />

      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex flex-row items-center gap-3 min-w-0">
          <div className="flex -space-x-2 shrink-0">
            {memberNames.slice(0, AVATAR_STACK_SIZE).map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex size-8 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background ring-2 ring-card"
              >
                {userInitials(name)}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>
        </div>

        {canInvite && requestCount > 0 && (
          <Link
            href="/account/team?tab=requests"
            className="shrink-0 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background"
          >
            {requestCount} {requestCount === 1 ? "request" : "requests"}
          </Link>
        )}
      </div>

      <div className="flex flex-row gap-2 mt-5">
        {canInvite && (
          <Button
            className="flex-1 rounded-full text-base py-6 font-semibold tracking-tight gap-2"
            size="lg"
            onClick={onInvite}
          >
            <IconUserPlus stroke={2} className="size-5" data-icon="inline-start" />
            Invite
          </Button>
        )}
        <Button
          asChild
          variant="outline"
          size="lg"
          className="flex-1 rounded-full text-base py-6 font-semibold tracking-tight gap-2 bg-card"
        >
          <Link href="/account/team">
            <IconUsers stroke={2} className="size-5" data-icon="inline-start" />
            View Team
          </Link>
        </Button>
      </div>
    </main>
  );
}

export default CompanyCard;
