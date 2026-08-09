"use client";

import useMagnetic from "@/hooks/useMagnetic";

/* ══════════════════════════════════════════════════════
   MagneticLink

   SideNav already had this behaviour hand-rolled around its
   resume link. This is the same effect as a reusable anchor
   so the primary CTAs share it instead of each growing their
   own copy.

   useMagnetic already no-ops on coarse pointers and under
   prefers-reduced-motion, so there is no extra gating here.

   It writes to `element.style.transform`, so never put this
   on something GSAP is also transforming — the two fight and
   the last writer per frame wins. The hero CTAs are safe:
   GSAP animates their wrapper, not the anchors themselves.
   ══════════════════════════════════════════════════════ */

export default function MagneticLink({
    href,
    className,
    children,
    external = false,
    radius = 48,
    pull = 8,
}: {
    href: string;
    className?: string;
    children: React.ReactNode;
    external?: boolean;
    radius?: number;
    pull?: number;
}) {
    const ref = useMagnetic<HTMLAnchorElement>(radius, pull);

    return (
        <a
            ref={ref}
            href={href}
            className={className}
            {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
        >
            {children}
        </a>
    );
}
