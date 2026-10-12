import { formatMonthYear, formatPhoneNumber } from "@/lib/helpers";
import { Profile } from "@/types/account";
import {
  IconCalendar,
  IconMail,
  IconPhone,
  IconPlus,
} from "@tabler/icons-react";
import React from "react";
import { Button } from "../ui/button";

function ContactInfo({
  profile,
  onEdit,
}: {
  profile: Pick<Profile, "email" | "createdAt" | "phone">;
  onEdit: () => void;
}) {
  const memberSince = formatMonthYear(new Date(profile.createdAt));

  return (
    <section className="flex flex-col gap-2 mt-8">
      <h2 className="uppercase text-xs text-muted-foreground">Account</h2>
      <div className="flex flex-col bg-card border border-muted-foreground/20 rounded-3xl px-4 divide-y divide-muted-foreground/20">
        <Row icon={<IconMail className="size-4" />} label="Email">
          <span className="text-sm text-muted-foreground truncate">
            {profile.email}
          </span>
        </Row>

        <Row icon={<IconPhone className="size-4" />} label="Phone">
          {profile.phone ? (
            <span className="text-sm text-muted-foreground truncate">
              {formatPhoneNumber(profile.phone)}
            </span>
          ) : (
            <Button
              variant="outline"
              size="xs"
              className="rounded-full bg-card border-dashed border-foreground/30 h-5 px-1.5 gap-1 text-[10px] [&_svg]:size-2.5"
              onClick={onEdit}
            >
              <IconPlus />
              Add
            </Button>
          )}
        </Row>

        <Row icon={<IconCalendar className="size-4" />} label="Member since">
          <span className="text-sm text-muted-foreground">{memberSince}</span>
        </Row>
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row items-center justify-between gap-3 py-3">
      <div className="flex flex-row items-center gap-3 min-w-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          {icon}
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <div className="flex items-center min-w-0">{children}</div>
    </div>
  );
}

export default ContactInfo;
