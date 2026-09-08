"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
    FOCUSABLE_SELECTOR,
    canRestoreFocus,
    nextFocusIndex,
} from "@/lib/focus";

/* ══════════════════════════════════════════════════════
   useFocusTrap

   Keeps Tab inside an open dialog and gives focus back to
   whatever opened it.

   All five dialogs on this site already declare
   `role="dialog"` and `aria-modal="true"` — they have said
   "nothing behind me is reachable" the whole time, and it
   was not true for any of them. Tab walked straight out into
   the page, and closing dropped focus on <body>, which puts
   a keyboard reader back at the very top of the tab order.

   ── A Tab HANDLER, NOT `inert` ──
   `inert` on the background is the tidier primitive, and it
   does not fit here: Lightbox and VideoPlayer are portalled
   to `document.body` (CaseStudyStage.tsx), so "the
   background" is every body child except the portal — a set
   that changes as the page mounts things, and that has to be
   un-inerted exactly on close or the site is left dead. A
   handler scoped to the container needs no knowledge of what
   is outside it.

   ── The arithmetic is in lib/focus.ts ──
   Wrapping at both ends and the empty-container case are the
   three ways this fails silently, so they are asserted there
   rather than reasoned about here.
   ══════════════════════════════════════════════════════ */

export default function useFocusTrap(
    ref: RefObject<HTMLElement | null>,
    active: boolean,
    /**
     * Focus this on open instead of the first focusable child. For the palette
     * and the gate, which already focus their own control and would otherwise
     * be fought over.
     */
    initial?: RefObject<HTMLElement | null>,
) {
    /* Captured on the way in, restored on the way out. A ref rather than
       state: writing it must never cause a render, and it has to survive the
       close transition, which unmounts on a timer. */
    const returnTo = useRef<Element | null>(null);

    useEffect(() => {
        if (!active) return;
        const root = ref.current;
        if (!root) return;

        returnTo.current = document.activeElement;

        /* One frame late, deliberately. Several of these dialogs mount and
           then transition in, and a `.focus()` in the same tick can land on a
           node the browser has not laid out yet — which scrolls the page.
           `requestAnimationFrame` is safe here because a dialog only opens in
           response to a real interaction, so the tab is visible. */
        const raf = requestAnimationFrame(() => {
            const target =
                initial?.current ??
                root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
            target?.focus();
        });

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Tab") return;

            const items = Array.from(
                root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
            ).filter(
                /* `offsetParent` is null for anything `display: none`, and the
                   palette keeps its ESC keycap hidden below `sm`. A hidden tab
                   stop is exactly the bug this hook exists to remove, so do not
                   trade one for another. */
                (el) => el.offsetParent !== null || el === document.activeElement,
            );

            const from = items.indexOf(document.activeElement as HTMLElement);
            const to = nextFocusIndex(items.length, from, e.shiftKey ? -1 : 1);
            if (to < 0) return;

            e.preventDefault();
            items[to].focus();
        };

        /* Capture, for the same reason components/Telemetry.tsx's click
           listener uses it: CommandPalette calls `stopPropagation()` on its
           own panel, and a bubble-phase listener would never see a Tab pressed
           inside it. */
        document.addEventListener("keydown", onKeyDown, { capture: true });

        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener("keydown", onKeyDown, {
                capture: true,
            });

            const back = returnTo.current;
            returnTo.current = null;
            if (canRestoreFocus(back)) back.focus();
        };
    }, [active, ref, initial]);
}
