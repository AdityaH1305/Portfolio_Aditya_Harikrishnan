"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion";
import { EASE } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   Reveal — the single scroll-reveal primitive

   Replaces 25 Framer `whileInView` blocks that were all
   the same animation with different hand-tuned delays.
   Per-element ScrollTrigger rather than ScrollTrigger.batch:
   batch replaces per-element delays with auto-stagger,
   which would re-choreograph all 25 sites at once. This
   keeps the migration a 1:1 substitution.

   FOUC: Framer applied its `initial` during SSR, so
   elements shipped as opacity:0 in the HTML. GSAP only
   runs after hydration. If the start state were applied
   by JS (gsap.from), every section would render visible,
   snap invisible, then animate. So the start state is an
   inline style rendered on the server and the tween is
   always gsap.to — never gsap.from.
   ══════════════════════════════════════════════════════ */

interface RevealProps {
    children: ReactNode;
    as?: ElementType;
    className?: string;
    /** Vertical travel in px. */
    y?: number;
    /** Horizontal travel in px (Journey's timeline uses -16). */
    x?: number;
    delay?: number;
    duration?: number;
    /**
     * When set, animates direct children instead of this element, staggered
     * by this many seconds. Children need `data-reveal-child` for the
     * server-rendered start state.
     */
    stagger?: number;
    /** ScrollTrigger start. Default fires a little before centre-screen. */
    start?: string;
}

export default function Reveal({
    children,
    as: Tag = "div",
    className,
    y = 16,
    x = 0,
    delay = 0,
    duration = 0.5,
    stagger,
    start = "top 85%",
}: RevealProps) {
    const ref = useRef<HTMLElement>(null);

    useGSAP(
        () => {
            const el = ref.current;
            if (!el) return;

            const targets =
                stagger != null
                    ? (Array.from(el.children) as HTMLElement[])
                    : [el];
            if (targets.length === 0) return;

            const mm = gsap.matchMedia();

            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const tween = gsap.to(targets, {
                    opacity: 1,
                    y: 0,
                    x: 0,
                    duration,
                    delay,
                    ease: EASE,
                    stagger: stagger ?? 0,
                    scrollTrigger: { trigger: el, start, once: true },
                });
                return () => {
                    tween.scrollTrigger?.kill();
                    tween.kill();
                };
            });

            mm.add("(prefers-reduced-motion: reduce)", () => {
                gsap.set(targets, { opacity: 1, y: 0, x: 0 });
            });

            return () => mm.revert();
        },
        { dependencies: [y, x, delay, duration, stagger, start] },
    );

    return (
        <Tag
            ref={ref}
            className={className}
            data-reveal=""
            style={
                stagger != null
                    ? undefined
                    : { opacity: 0, transform: `translate(${x}px, ${y}px)` }
            }
        >
            {children}
        </Tag>
    );
}
