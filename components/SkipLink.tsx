"use client";

import { usePathname } from "next/navigation";
import { isHome } from "@/lib/commands";

/* ══════════════════════════════════════════════════════
   SkipLink

   The first focusable thing in the document, invisible until
   it is focused. Off-canvas rather than `display: none`,
   because a hidden element is not focusable and this only
   works if Tab can reach it.

   ── THE TARGET IS ROUTE-DEPENDENT, AND THAT IS NOT FUSSINESS ──
   On /work/*, `<main>` in CaseStudyChrome comes after the
   header, so `#main` skips exactly what a skip link should.

   On the HOME page it would skip nothing. `<main>` there
   opens with the signal gate, the uplink chip, five fixed
   canvases and the nav rail — everything a reader would want
   to jump past is INSIDE it. The first real content is the
   hero, which already carries `id="intro"` as part of the
   section contract, so that is what home targets.

   Both targets carry `tabIndex={-1}`: without it the browser
   moves the viewport but leaves focus on the link, and the
   next Tab goes back to the top of the page.

   ── Hidden while the gate is up ──
   `body:has(.signal-gate) .skip-link` in globals.css. A tab
   stop into a page the reader has explicitly not entered yet
   is worse than no skip link at all, and the gate's own trap
   would fight it for focus.
   ══════════════════════════════════════════════════════ */

export default function SkipLink() {
    const pathname = usePathname();
    const href = isHome(pathname) ? "#intro" : "#main";

    return (
        <a className="skip-link" href={href}>
            Skip to content
        </a>
    );
}
