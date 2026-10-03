"use client";

import { useCallback, useEffect, useRef } from "react";

// Matches the iOS/Android system long-press feel — long enough not to fire
// on a slow tap, short enough not to feel stuck.
const LONG_PRESS_MS = 450;
// A finger that drifts further than this is scrolling, not holding.
const MOVE_TOLERANCE_PX = 10;

// Returns a `bind(id)` that spreads pointer handlers onto an element. Holding
// still for LONG_PRESS_MS calls `onLongPress(id)`, and the click the browser
// sends on release is swallowed so it doesn't also act as a tap.
export function useLongPress(onLongPress: (id: string) => void) {
  const onLongPressRef = useRef(onLongPress);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  // Set when a long press fires; the next click is the release of that same
  // press. Reset on every pointerdown, because iOS often sends no click after
  // a long press — a stale flag would otherwise eat the next real tap.
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);

  return useCallback(
    (id: string) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        fired.current = false;
        cancel();
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => {
          timer.current = null;
          start.current = null;
          fired.current = true;
          // Android only — iOS Safari has no vibration API.
          navigator.vibrate?.(10);
          onLongPressRef.current(id);
        }, LONG_PRESS_MS);
      },
      onPointerMove: (e: React.PointerEvent) => {
        const s = start.current;
        if (!s) return;
        if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_TOLERANCE_PX) {
          cancel();
        }
      },
      // pointercancel is what the browser sends when a touch turns into a
      // scroll, so a hold that becomes a scroll never fires.
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      // Android's long-press menu and desktop right-click.
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onClickCapture: (e: React.MouseEvent) => {
        if (fired.current) {
          fired.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      },
    }),
    [cancel],
  );
}
