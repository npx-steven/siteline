"use client";

import { changeMemberRoleAction, removeMemberAction } from "@/actions/team";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatMonthYear, userInitials } from "@/lib/helpers";
import {
  GRANTABLE_ROLES,
  GrantableRole,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "@/lib/roles";
import { cn } from "@/lib/utils";
import { TeamMember } from "@/types/account";
import { Role } from "@/types/db";
import {
  IconCircle,
  IconCircleCheckFilled,
  IconClipboardList,
  IconCrown,
  IconHelmet,
  IconMail,
  IconPhone,
  IconUserMinus,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

type MemberDrawerProps = {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Whether the viewer is an owner. Owners can change roles and remove
  // members, except themselves and other owners.
  canManageMembers: boolean;
};

const ROLE_ICONS: Record<Role, typeof IconCrown> = {
  owner: IconCrown,
  project_manager: IconClipboardList,
  crew: IconHelmet,
};

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function MemberDrawer({
  member,
  open,
  onOpenChange,
  canManageMembers,
}: MemberDrawerProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setConfirmingRemove(false);
    onOpenChange(nextOpen);
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction="bottom">
      <DrawerContent
        className="rounded-t-3xl bg-background data-[vaul-drawer-direction=bottom]:max-h-[92vh]"
        aria-describedby={undefined}
      >
        {member &&
          (confirmingRemove ? (
            <ConfirmRemove
              member={member}
              onCancel={() => setConfirmingRemove(false)}
              onRemoved={() => handleOpenChange(false)}
            />
          ) : (
            <MemberDetails
              key={member.id}
              member={member}
              canEdit={canManageMembers && !member.isYou && member.role !== "owner"}
              onRemove={() => setConfirmingRemove(true)}
            />
          ))}
      </DrawerContent>
    </Drawer>
  );
}

// --- Details ----------------------------------------------------------------

function MemberDetails({
  member,
  canEdit,
  onRemove,
}: {
  member: TeamMember;
  canEdit: boolean;
  onRemove: () => void;
}) {
  // Shown immediately; reverted if the server rejects the change.
  const [role, setRole] = useState<Role>(member.role);
  const [isSaving, setIsSaving] = useState(false);

  async function applyRole(next: GrantableRole, previous: Role) {
    setRole(next);
    setIsSaving(true);
    const { error } = await changeMemberRoleAction(member.id, next);
    setIsSaving(false);

    if (error) {
      setRole(previous);
      toast.error(error);
      return false;
    }
    return true;
  }

  async function handleSelect(next: GrantableRole) {
    if (next === role || isSaving) return;
    // Owners' roles are never editable here, so the current role is grantable.
    const previous = role as GrantableRole;

    if (!(await applyRole(next, previous))) return;

    toast.success(`${firstName(member.fullName)} is now ${ROLE_LABELS[next]}`, {
      action: {
        label: "Undo",
        onClick: () => {
          void applyRole(previous, next);
        },
      },
    });
  }

  // Owners pick between the grantable roles; everyone else just sees theirs.
  const options: Role[] = canEdit ? [...GRANTABLE_ROLES].reverse() : [role];

  return (
    <div className="flex flex-col px-4 pt-2 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))]">
      <div className="flex justify-end">
        <DrawerClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full bg-muted text-foreground hover:bg-muted/80"
            aria-label="Close"
          >
            <IconX className="size-4" />
          </Button>
        </DrawerClose>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-foreground text-2xl font-semibold text-background">
          {userInitials(member.fullName)}
        </div>
        <DrawerTitle className="mt-4 text-2xl font-bold tracking-tight capitalize">
          {member.fullName}
          {member.isYou && (
            <span className="font-normal text-muted-foreground"> (You)</span>
          )}
        </DrawerTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {member.email} · Joined {formatMonthYear(new Date(member.joinedAt))}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {member.phone ? (
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full bg-card text-base"
          >
            <a href={`tel:${member.phone}`}>
              <IconPhone className="size-4" />
              Call
            </a>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            className="rounded-full bg-card text-base"
            disabled
            aria-label="No phone number"
          >
            <IconPhone className="size-4" />
            Call
          </Button>
        )}
        <Button
          asChild
          variant="outline"
          size="lg"
          className="rounded-full bg-card text-base"
        >
          <a href={`mailto:${member.email}`}>
            <IconMail className="size-4" />
            Email
          </a>
        </Button>
      </div>

      <p className="mt-8 mb-2 uppercase text-xs text-muted-foreground">Role</p>
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const Icon = ROLE_ICONS[option];
          const selected = option === role;
          return (
            <button
              key={option}
              type="button"
              disabled={!canEdit || isSaving}
              onClick={() => handleSelect(option as GrantableRole)}
              aria-pressed={selected}
              className={cn(
                "flex flex-row items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors",
                selected ? "border-foreground" : "border-border",
                !canEdit && "cursor-default",
              )}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Icon className="size-5" />
              </div>
              <div className="flex flex-1 flex-col min-w-0">
                <p className="text-sm font-semibold">{ROLE_LABELS[option]}</p>
                <p className="text-xs text-muted-foreground text-pretty">
                  {ROLE_DESCRIPTIONS[option]}
                </p>
              </div>
              {canEdit &&
                (selected ? (
                  <IconCircleCheckFilled className="size-6 shrink-0" />
                ) : (
                  <IconCircle className="size-6 shrink-0 text-muted-foreground" />
                ))}
            </button>
          );
        })}
      </div>

      {canEdit && (
        <Button
          type="button"
          size="lg"
          onClick={onRemove}
          disabled={isSaving}
          className="mt-6 w-full rounded-full py-6 text-base bg-destructive/10 text-destructive hover:bg-destructive/15"
        >
          <IconUserMinus className="size-5" />
          Remove from Company
        </Button>
      )}
    </div>
  );
}

// --- Confirm removal --------------------------------------------------------

function ConfirmRemove({
  member,
  onCancel,
  onRemoved,
}: {
  member: TeamMember;
  onCancel: () => void;
  onRemoved: () => void;
}) {
  const [isRemoving, setIsRemoving] = useState(false);
  const name = firstName(member.fullName);

  async function handleRemove() {
    setIsRemoving(true);
    const { error } = await removeMemberAction(member.id);
    if (error) {
      toast.error(error);
      setIsRemoving(false);
      return;
    }
    toast.success(`${name} was removed`);
    onRemoved();
  }

  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1.5rem))] text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <IconUserMinus className="size-7" />
      </div>
      <DrawerTitle className="mt-5 text-2xl font-bold tracking-tight capitalize">
        Remove {name}?
      </DrawerTitle>
      <p className="mt-2 text-sm text-muted-foreground text-pretty max-w-80">
        They&apos;ll lose access to every project right away. Photos and
        documents they added stay with the projects.
      </p>

      <div className="mt-8 flex w-full flex-col gap-3">
        <Button
          type="button"
          size="lg"
          onClick={handleRemove}
          disabled={isRemoving}
          className="w-full rounded-full py-6 text-base bg-destructive/10 text-destructive hover:bg-destructive/15 capitalize"
        >
          {isRemoving ? "Removing..." : `Remove ${name}`}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          onClick={onCancel}
          disabled={isRemoving}
          className="w-full rounded-full py-6 text-base"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default MemberDrawer;
