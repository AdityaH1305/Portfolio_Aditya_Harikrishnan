"use client";

import { useEffect } from "react";
import { deviceTier } from "@/lib/deviceTier";

/* ══════════════════════════════════════════════════════
   The device tier, as a class on <html>

   `lib/deviceTier.ts` is what the canvases read. CSS cannot call a function,
   so anything that has to stand down in a stylesheet — a `backdrop-filter`
   over a scrolling page, a conic gradient repainting every frame — needs the
   verdict as a selector. This is the one place that writes it.

   ── Why an effect and not the pre-paint script in layout.tsx ──
   That script exists to add `signal-connected` before React hydrates, which
   is the only way a returning visitor never sees the gate flash. It is worth
   its cost because a flash is unavoidable otherwise. This is not: a tier
   arriving one frame late costs a single frame of a blur that was going to be
   there anyway, and `navigator.hardwareConcurrency` read during render is a
   hydration mismatch — `app/layout.tsx` already carries
   `suppressHydrationWarning` on <html> for one specific reason, and a second
   source of drift would hide the first.

   Rendering nothing and living in `app/template.tsx` beside `LiveRings`, for
   the same reason that one does: `layout.tsx` persists across navigations,
   and this should re-assert itself per route rather than assume it survived.
   Writing the same class twice is free.
   ══════════════════════════════════════════════════════ */

export default function DeviceTierFlag() {
    useEffect(() => {
        const html = document.documentElement;
        const tier = deviceTier();

        /* `data-tier` rather than a class: it is one value out of three, not a
           set of flags, and an attribute cannot drift into two of them being
           set at once. `[data-tier="low"]` reads the same in CSS. */
        html.dataset.tier = tier;

        /* Deliberately NOT removed on unmount. The tier is a property of the
           machine, not of this route, and it cannot change within a page load
           — `deviceTier()` caches its answer for exactly that reason. Tearing
           it off on a navigation would drop every rule that depends on it for
           the frame between one template unmounting and the next mounting. */
    }, []);

    return null;
}
