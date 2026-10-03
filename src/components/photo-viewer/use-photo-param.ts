"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";

const PARAM = "photo";

function urlWithPhoto(id: string | null): string {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(PARAM, id);
  else url.searchParams.delete(PARAM);
  return url.pathname + url.search + url.hash;
}

// Keeps the open photo in the URL (?photo=<id>) so the back gesture / Android
// back button closes the viewer instead of leaving the page, and a link to a
// specific photo opens straight into it.
//
// Uses the native History API, which Next.js syncs into useSearchParams
// without a server round trip — router.push would refetch the page's RSC
// payload on every swipe.
export function usePhotoParam() {
  const openId = useSearchParams().get(PARAM);

  // True when this page pushed the ?photo entry, so closing can pop it rather
  // than stacking a new one. A deep link that landed on ?photo= has no entry
  // of ours beneath it, so going back would leave the page.
  const pushedRef = useRef(false);

  const open = useCallback((id: string) => {
    window.history.pushState(null, "", urlWithPhoto(id));
    pushedRef.current = true;
  }, []);

  // Swiping replaces rather than pushes — back should close the viewer, not
  // step through every photo that was swiped past.
  const show = useCallback((id: string) => {
    window.history.replaceState(null, "", urlWithPhoto(id));
  }, []);

  const close = useCallback(() => {
    // Already closed by the back button — going back again would leave.
    if (!new URL(window.location.href).searchParams.has(PARAM)) return;

    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", urlWithPhoto(null));
    }
  }, []);

  return { openId, open, show, close };
}
