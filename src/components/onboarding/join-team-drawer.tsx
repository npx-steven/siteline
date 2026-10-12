"use client";

import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { IconLink } from "@tabler/icons-react";

const STEPS = [
  {
    n: 1,
    title: "Ask for a link",
    body: "An owner or manager at your company can send you a join link.",
  },
  {
    n: 2,
    title: "Open it on this phone",
    body: "Tap the link from your text or email on this device.",
  },
  {
    n: 3,
    title: "Get approved",
    body: "Create your account and send a request. Once an owner or manager approves you, you're in.",
  },
];

export function JoinTeamDrawer() {
  return (
    <Drawer>
      <DrawerTrigger asChild className="mt-4">
        <Button variant="link" size="sm" className="text-muted-foreground">
          <IconLink className="size-4" />
          Joining a team?
        </Button>
      </DrawerTrigger>

      <DrawerContent className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-md pt-2">
          {/* icon badge */}
          <div className="mb-4 inline-flex rounded-xl bg-muted p-3">
            <IconLink className="size-6" />
          </div>

          <DrawerTitle className="text-2xl font-bold tracking-tight">
            Joining a team?
          </DrawerTitle>
          <DrawerDescription className="mt-2 text-base text-muted-foreground text-pretty">
            Siteline companies are invite-only. Ask an owner or manager
            for a join link, then request access. They approve each new
            teammate.
          </DrawerDescription>

          {/* steps */}
          <div className="my-6 divide-y">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-4 py-4 text-left">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                  {s.n}
                </div>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DrawerClose asChild>
            <Button size="lg" className="w-full rounded-full text-base py-6">
              Got It
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
