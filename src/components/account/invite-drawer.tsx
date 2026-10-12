"use client";

import { getJoinLinkAction } from "@/actions/join";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { GRANTABLE_ROLES, GrantableRole, ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  IconClock,
  IconCopy,
  IconLink,
  IconShare,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type InviteDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
};

type JoinLink = {
  role: GrantableRole;
  token: string;
  expiresAt: string;
};

function daysUntil(expiresAt: string): number {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function InviteDrawer({ open, onOpenChange, companyName }: InviteDrawerProps) {
  // Each role has its own link; the request records which one was used.
  const [role, setRole] = useState<GrantableRole>("crew");
  const [link, setLink] = useState<JoinLink | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    // Returns the live link for this role, or a fresh one if it expired.
    getJoinLinkAction(role).then((result) => {
      if (cancelled) return;
      if (result.error || !result.token || !result.expiresAt) {
        toast.error(result.error ?? "Couldn't load the join link");
        return;
      }
      setLink({ role, token: result.token, expiresAt: result.expiresAt });
    });

    return () => {
      cancelled = true;
    };
  }, [open, role]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setLink(null);
    onOpenChange(nextOpen);
  }

  // A link fetched for the other role is stale until the new one arrives.
  const current = link?.role === role ? link : null;
  const isLoading = current === null;
  const linkUrl =
    current && typeof window !== "undefined"
      ? `${window.location.origin}/join/${current.token}`
      : "";
  const expiresInDays = current ? daysUntil(current.expiresAt) : null;

  async function handleCopy() {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  async function handleShare() {
    if (!linkUrl) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Join ${companyName} on Siteline`,
          text: `Request to join ${companyName} on Siteline.`,
          url: linkUrl,
        });
      } catch {
        // User cancelled or share failed silently — no toast needed
      }
    } else {
      await handleCopy();
    }
  }

  async function handleReset() {
    setIsResetting(true);
    const result = await getJoinLinkAction(role, true);
    setIsResetting(false);
    setConfirmResetOpen(false);

    if (result.error || !result.token || !result.expiresAt) {
      toast.error(result.error ?? "Couldn't reset the link");
      return;
    }
    setLink({ role, token: result.token, expiresAt: result.expiresAt });
    toast.success("Link reset", {
      description: "The old link no longer works.",
      duration: 5000,
    });
  }

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      direction="bottom"
      repositionInputs={false}
    >
      <DrawerContent
        className="rounded-t-3xl bg-background data-[vaul-drawer-direction=bottom]:max-h-[92vh]"
        aria-describedby={undefined}
        autoFocus={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DrawerHeader className="flex flex-row items-center justify-between px-4 pb-0">
          <DrawerTitle className="text-2xl font-bold tracking-tight">
            Invite Teammates
          </DrawerTitle>
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
        </DrawerHeader>

        <div className="flex flex-col gap-5 px-4 pt-2 pb-[max(3rem,calc(env(safe-area-inset-bottom)+1.5rem))]">
          <p className="text-base text-muted-foreground">
            People who open this link ask to join{" "}
            <span className="font-semibold text-foreground">{companyName}</span>
            . You approve them in Team.
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">They join as</label>
            <div className="flex w-full rounded-full bg-neutral-200 py-0.5">
              {GRANTABLE_ROLES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  className={cn(
                    "flex-1 rounded-full py-1.5 text-sm font-medium transition-all",
                    role === option
                      ? "bg-foreground text-background shadow-xl"
                      : "text-muted-foreground",
                  )}
                >
                  {ROLE_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Invite link</label>
            <InputGroup>
              <InputGroupAddon>
                <IconLink className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                readOnly
                value={isLoading ? "Loading…" : linkUrl}
                className="font-mono text-sm"
              />
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  disabled={isLoading}
                  className="rounded-full h-8 gap-1"
                >
                  <IconCopy className="size-3.5" />
                  Copy
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={handleShare}
            disabled={isLoading}
            className="w-full rounded-full py-6 text-base font-semibold gap-2"
          >
            <IconShare className="size-5" />
            Share Link
          </Button>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <IconClock className="size-3.5" />
            {expiresInDays !== null ? (
              <span>
                Expires in {expiresInDays} {expiresInDays === 1 ? "day" : "days"}
              </span>
            ) : (
              <span>Loading…</span>
            )}
            <span>·</span>
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              disabled={isLoading || isResetting}
              className="font-semibold text-foreground disabled:opacity-50"
            >
              Reset Link
            </button>
          </div>

          <AlertDialog
            open={confirmResetOpen}
            onOpenChange={(value) => {
              if (!isResetting) setConfirmResetOpen(value);
            }}
          >
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset {ROLE_LABELS[role]} Link?</AlertDialogTitle>
                <AlertDialogDescription>
                  The current link stops working right away. Requests already
                  sent stay in Team.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel variant="outline" disabled={isResetting}>
                  Cancel
                </AlertDialogCancel>
                <Button disabled={isResetting} onClick={handleReset}>
                  {isResetting ? "Resetting..." : "Reset"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default InviteDrawer;
