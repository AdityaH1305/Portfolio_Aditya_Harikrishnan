"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   Hero

   Carries on typography alone — the WebGL fluid that used
   to sit behind it is gone. The LivingArchitecture atlas
   occupies the right ~48% of the viewport, which is why
   this column stays capped at max-w-2xl.

   Entrance is one GSAP timeline using absolute position
   parameters, which preserves the previously hand-tuned
   delays exactly while making them retimeable in one place.

   Start states are inline styles so they are server-
   rendered. GSAP only runs after hydration, so animating
   with gsap.from() would render the content visible, snap
   it invisible, then animate — a flash on every load.
   ══════════════════════════════════════════════════════ */

/* Experience sits second, directly after Education: the ISRO internship is
   the strongest single credential here and it previously appeared nowhere
   above the Gait case study — a reader could finish the whole timeline
   without ever learning about it. */
const facts = [
    { label: "Education", lines: ["B.Tech Computer Science", "IIIT Pune"] },
    { label: "Experience", lines: ["Research Intern", "ISRO · LPSC"] },
    { label: "Focus", lines: ["ML Systems", "Full-Stack", "System Design"] },
    { label: "Status", lines: ["Open to internships", "& research roles"] },
];

const RESUME_URL =
    "https://drive.google.com/file/d/1vzrKEpDGGLUcU3jRtCm9lk6MLR7-7NG-/view?usp=sharing";

const hidden = (y: number) => ({
    opacity: 0,
    transform: `translateY(${y}px)`,
});

export default function Hero() {
    const root = useRef<HTMLElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);

    useGSAP(
        () => {
            const mm = gsap.matchMedia();

            mm.add("(prefers-reduced-motion: no-preference)", () => {
                let cancelled = false;
                let cleanup: (() => void) | undefined;

                /* Fonts must be ready before splitting. next/font uses
                   display:swap, so splitting against fallback metrics gives
                   wrong per-character offsets and visibly reflows when the
                   real face arrives. */
                void document.fonts.ready.then(async () => {
                    if (cancelled) return;

                    const { SplitText } = await import("gsap/SplitText");
                    gsap.registerPlugin(SplitText);
                    if (cancelled || !headingRef.current) return;

                    const split = SplitText.create(headingRef.current, {
                        type: "chars",
                        // Without aria handling, wrapping each letter in a
                        // span makes screen readers announce the h1 letter
                        // by letter.
                        aria: "auto",
                        mask: "chars",
                    });

                    gsap.set(headingRef.current, { opacity: 1 });
                    gsap.set(split.chars, { yPercent: 110, opacity: 0 });

                    const tl = gsap.timeline({
                        defaults: { ease: EASE, duration: 1 },
                    });

                    tl.to("[data-hero='eyebrow']", { opacity: 1, y: 0, duration: 0.8 }, 0.15)
                        .to(split.chars, {
                            yPercent: 0,
                            opacity: 1,
                            duration: 0.9,
                            stagger: 0.028,
                        }, 0.25)
                        .to("[data-hero='tagline']", { opacity: 1, y: 0 }, 0.5)
                        .to("[data-hero='support']", { opacity: 1, y: 0 }, 0.65)
                        .to("[data-hero='facts']", { opacity: 1, y: 0 }, 0.8)
                        .to("[data-hero='ctas']", { opacity: 1, y: 0 }, 0.95);

                    cleanup = () => {
                        tl.kill();
                        // Must revert, or Fast Refresh re-splits already-split
                        // DOM and multiplies the character spans.
                        split.revert();
                    };
                });

                return () => {
                    cancelled = true;
                    cleanup?.();
                };
            });

            mm.add("(prefers-reduced-motion: reduce)", () => {
                gsap.set("[data-hero]", { opacity: 1, y: 0 });
            });

            return () => mm.revert();
        },
        { scope: root },
    );

    return (
        <section
            ref={root}
            id="intro"
            className="relative min-h-[100dvh] flex items-center overflow-hidden pt-24 pb-20 md:pt-0 md:pb-0"
        >
            <div className="section-container w-full relative z-[1]">
                <div className="max-w-2xl">
                    <p className="label" data-hero="eyebrow" style={hidden(12)}>
                        Intro
                    </p>

                    {/* Explicit aria-label: SplitText derives one from the
                        text content, and because the two lines are separate
                        block spans with no whitespace between them it comes
                        out as "ADITYAHARIKRISHNAN" — one word to a screen
                        reader. */}
                    <h1
                        ref={headingRef}
                        className="display mt-6"
                        data-hero="heading"
                        aria-label="Aditya Harikrishnan"
                        style={{ opacity: 0 }}
                    >
                        <span className="block">ADITYA</span>
                        <span className="block">HARIKRISHNAN</span>
                    </h1>

                    <p
                        data-hero="tagline"
                        style={hidden(24)}
                        className="mt-8 text-xl md:text-2xl lg:text-3xl
                                   font-light leading-snug tracking-tight text-secondary"
                    >
                        Building systems,
                        <br />
                        <span className="text-primary">not just websites.</span>
                    </p>

                    <p
                        data-hero="support"
                        style={hidden(16)}
                        className="mt-6 body-lg max-w-md"
                    >
                        From recommendation engines to large-scale discovery
                        platforms.
                    </p>

                    <div
                        data-hero="facts"
                        style={hidden(16)}
                        className="mt-12 flex flex-wrap gap-x-12 gap-y-5"
                    >
                        {facts.map((fact) => (
                            <div key={fact.label}>
                                <p className="label-muted mb-2">{fact.label}</p>
                                {fact.lines.map((line) => (
                                    <p
                                        key={line}
                                        className="text-sm text-secondary leading-relaxed"
                                    >
                                        {line}
                                    </p>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div
                        data-hero="ctas"
                        style={hidden(16)}
                        className="mt-14 flex flex-wrap items-center gap-4"
                    >
                        <a href="#work" className="btn-primary group/btn pr-2">
                            <span className="pl-2">View My Work</span>
                            <span
                                className="ml-2 w-8 h-8 rounded-full bg-black/15
                                           flex items-center justify-center
                                           transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                                           group-hover/btn:translate-x-1 group-hover/btn:-translate-y-px"
                            >
                                <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                                </svg>
                            </span>
                        </a>
                        <a
                            href={RESUME_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                        >
                            View Resume
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
