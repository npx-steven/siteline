"use client";

import {
  approveJoinRequestAction,
  declineJoinRequestAction,
} from "@/actions/join";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { userInitials } from "@/lib/helpers";
import { GrantableRole, ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { JoinRequest, TeamMember } from "@/types/account";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconUserPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import InviteDrawer from "./invite-drawer";
import MemberDrawer from "./member-drawer";

type Tab = "members" | "requests";

type TeamViewProps = {
  companyName: string;
  members: TeamMember[];
  requests: JoinRequest[];
  canManageRequests: boolean;
  canManageMembers: boolean;
  initialTab: Tab;
};

function TeamView({
  companyName,
  members,
  requests,
  canManageRequests,
  canManageMembers,
  initialTab,
}: TeamViewProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [inviteOpen, setInviteOpen] = useState(false);
  // Kept by id so the drawer shows fresh data after a role change revalidates.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberOpen, setMemberOpen] = useState(false);
  const selectedMember = members.find((m) => m.id === selectedId) ?? null;

  function openMember(id: string) {
    setSelectedId(id);
    setMemberOpen(true);
  }

  return (
    <div className="px-4 pb-32 h-dvh overflow-y-auto">
      <div className="flex flex-row items-center justify-between py-4">
        <Button
          asChild
          variant="frosted"
          size="icon-lg"
          className="rounded-full"
        >
          <Link href="/account" aria-label="Back to account">
            <IconChevronLeft stroke={1.5} className="size-4" />
          </Link>
        </Button>
        {canManageRequests && (
          <Button
            variant="frosted"
            size="icon-lg"
            className="rounded-full"
            onClick={() => setInviteOpen(true)}
            aria-label="Invite teammates"
          >
            <IconUserPlus stroke={1.5} className="size-4" />
          </Button>
        )}
      </div>

      <h1 className="text-3xl font-bold tracking-tight mt-2">Team</h1>
      <p className="text-sm text-muted-foreground tracking-tight capitalize">
        {companyName}
      </p>

      {canManageRequests && (
        <div className="flex w-full rounded-full bg-neutral-200 py-0.5 mt-6">
          {(
            [
              ["members", `Members · ${members.length}`],
              ["requests", `Requests · ${requests.length}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-medium transition-all",
                tab === value
                  ? "bg-foreground text-background shadow-xl"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === "members" ? (
        <MembersList members={members} onSelect={openMember} />
      ) : (
        <RequestsList
          requests={requests}
          onInvite={() => setInviteOpen(true)}
        />
      )}

      <MemberDrawer
        member={selectedMember}
        open={memberOpen && selectedMember !== null}
        onOpenChange={setMemberOpen}
        canManageMembers={canManageMembers}
      />

      {canManageRequests && (
        <InviteDrawer
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          companyName={companyName}
        />
      )}
    </div>
  );
}

// --- Members ----------------------------------------------------------------

function MembersList({
  members,
  onSelect,
}: {
  members: TeamMember[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col bg-card border border-muted-foreground/20 rounded-3xl px-4 mt-4 divide-y divide-muted-foreground/20">
      {members.map((member) => (
        <button
          key={member.id}
          type="button"
          onClick={() => onSelect(member.id)}
          className="flex flex-row items-center justify-between gap-3 py-3 text-left"
        >
          <div className="flex flex-row items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {userInitials(member.fullName)}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-semibold truncate">
                <span className="capitalize">{member.fullName}</span>
                {member.isYou && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (You)
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {member.email}
              </p>
            </div>
          </div>
          <div className="flex flex-row items-center gap-1 shrink-0">
            <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
            <IconChevronRight className="size-4 text-muted-foreground" />
          </div>
        </button>
      ))}
    </div>
  );
}

// --- Requests ---------------------------------------------------------------

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return `${Math.floor(hours / 24)}d ago`;
}

function RequestsList({
  requests,
  onInvite,
}: {
  requests: JoinRequest[];
  onInvite: () => void;
}) {
  return (
    <>
      <p className="text-sm text-muted-foreground mt-4">
        Requests expire after 14 days.
      </p>
      {requests.length === 0 ? (
        <div className="flex flex-col items-center gap-3 bg-card border border-muted-foreground/20 rounded-3xl px-4 py-8 mt-3 text-center">
          <p className="text-sm font-semibold">No requests right now</p>
          <p className="text-xs text-muted-foreground text-pretty max-w-60">
            Share your invite link. New requests to join show up here.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-card gap-1.5"
            onClick={onInvite}
          >
            <IconUserPlus className="size-4" />
            Invite
          </Button>
        </div>
      ) : (
        <div className="flex flex-col bg-card border border-muted-foreground/20 rounded-3xl px-4 mt-3 divide-y divide-muted-foreground/20">
          {requests.map((request) => (
            <RequestRow key={request.id} request={request} />
          ))}
        </div>
      )}
    </>
  );
}

function RequestRow({ request }: { request: JoinRequest }) {
  // Starts as the role of the link they used; tap the pill to switch.
  const [role, setRole] = useState<GrantableRole>(request.requestedRole);
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);

  async function handleAccept() {
    setPending("accept");
    const { error } = await approveJoinRequestAction(request.id, role);
    // On success the server revalidates and this row disappears.
    if (error) {
      toast.error(error);
      setPending(null);
      return;
    }
    toast.success(`${request.fullName} joined as ${ROLE_LABELS[role]}`);
  }

  async function handleDecline() {
    setPending("decline");
    const { error } = await declineJoinRequestAction(request.id);
    if (error) {
      toast.error(error);
      setPending(null);
      return;
    }
    toast.success("Request declined");
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="flex flex-row items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {userInitials(request.fullName)}
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-semibold capitalize truncate">
              {request.fullName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {request.email}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground pt-1">
          {timeAgo(request.requestedAt)}
        </span>
      </div>

      <div className="flex flex-row items-center justify-between gap-2">
        <button
          type="button"
          onClick={() =>
            setRole((r) => (r === "crew" ? "project_manager" : "crew"))
          }
          disabled={pending !== null}
          aria-label={`Joins as ${ROLE_LABELS[role]}. Tap to change.`}
          className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium disabled:opacity-50"
        >
          As {ROLE_LABELS[role]}
        </button>
        <div className="flex flex-row gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleDecline}
            disabled={pending !== null}
            className="rounded-full"
          >
            {pending === "decline" ? "Declining..." : "Decline"}
          </Button>
          <Button
            type="button"
            onClick={handleAccept}
            disabled={pending !== null}
            className="rounded-full gap-1"
          >
            <IconCheck className="size-4" />
            {pending === "accept" ? "Accepting..." : "Accept"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TeamView;
