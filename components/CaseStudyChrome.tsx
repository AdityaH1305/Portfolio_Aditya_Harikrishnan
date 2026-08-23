"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { caseStudyByPath, CASE_STUDIES } from "@/lib/caseStudies";
import Logo from "@/components/Logo";

/* ══════════════════════════════════════════════════════
   CaseStudyChrome

   The persistent frame around every /work/* route: ambient
   atlas, a back link, the project name, a reading-progress
   rail, and prev/next between case studies.

   It lives in the route layout, which never sees a page's
   props — so the title is recovered from the pathname via
   the shared registry rather than passed down.
   ══════════════════════════════════════════════════════ */

const LivingArchitecture = dynamic(
    () => import("@/components/LivingArchitecture/LivingArchitecture"),
    { ssr: false },
);

export default function CaseStudyChrome({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const current = caseStudyByPath(pathname);
    const barRef = useRef<HTMLDivElement>(null);

    const index = CASE_STUDIES.findIndex((c) => c.slug === current?.slug);
    const next =
        index >= 0 ? CASE_STUDIES[(index + 1) % CASE_STUDIES.length] : undefined;

    useGSAP(
        () => {
            const mm = gsap.matchMedia();

            /* Under reduced motion the rail is left at 0 rather than
               scrubbed — a bar tracking the scroll is exactly the kind of
               continuous motion the preference asks us to drop. */
            mm.add("(prefers-reduced-motion: no-preference)", () => {
                const bar = barRef.current;
                if (!bar) return;

                const st = ScrollTrigger.create({
                    start: 0,
                    end: "max",
                    scrub: true,
                    onUpdate: (self) =>
                        gsap.set(bar, { scaleX: self.progress }),
                });
                return () => st.kill();
            });

            return () => mm.revert();
        },
        { dependencies: [pathname] },
    );

    return (
        <>
            <LivingArchitecture ambient />

            {/* Reading progress. Fixed, hairline, above the atlas. */}
            <div
                className="fixed top-0 left-0 right-0 h-px z-40 bg-edge"
                aria-hidden="true"
            >
                <div
                    ref={barRef}
                    className="h-full bg-accent origin-left"
                    style={{ transform: "scaleX(0)" }}
                />
            </div>

            {/* Route header. Sticky rather than fixed so it participates in
                the document and cannot overlap the footer. */}
            <header className="sticky top-0 z-30 bg-surface-0/80 backdrop-blur-md">
                <div className="section-container">
                    <div className="flex items-center gap-4 h-14 md:h-16">
                        {/* THE ONLY ROUTE BACK TO THE SITE ROOT. The back link
                            beside this goes to `/#work` — the projects
                            section — so before the mark existed a reader who
                            arrived on a case study from a search result had no
                            path to the home page at all, and no branding
                            telling them whose work they were reading.

                            `shrink-0` so the truncating title beside it can
                            never squeeze the mark; see the row's width budget
                            at 375px in the header comment. */}
                        <Link
                            href="/"
                            aria-label="Aditya Harikrishnan — home"
                            className="shrink-0 text-tertiary transition-colors duration-200"
                        >
                            <Logo />
                        </Link>

                        <span
                            aria-hidden="true"
                            className="w-px h-4 bg-edge-strong shrink-0"
                        />

                        <Link
                            href="/#work"
                            className="group/back flex items-center gap-2 shrink-0
                                       mono text-xs text-tertiary hover:text-accent
                                       transition-colors duration-200"
                        >
                            <span
                                aria-hidden="true"
                                className="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                                           group-hover/back:-translate-x-0.5"
                            >
                                ←
                            </span>
                            <span className="hidden sm:inline">All work</span>
                            <span className="sm:hidden">Back</span>
                        </Link>

                        {current && (
                            <>
                                <span
                                    aria-hidden="true"
                                    className="w-px h-4 bg-edge-strong"
                                />
                                <p className="text-sm text-secondary truncate">
                                    {current.title}
                                </p>
                                <span className="ml-auto mono text-xs text-quaternary tabular-nums shrink-0">
                                    {String(index + 1).padStart(2, "0")} /{" "}
                                    {String(CASE_STUDIES.length).padStart(2, "0")}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="relative z-[1]">{children}</main>

            {/* Onward link — a case study should never be a dead end. */}
            {next && (
                <nav className="relative z-[1]">
                    <div className="section-container">
                        <Link
                            href={`/work/${next.slug}`}
                            className="group/next block py-16 md:py-24"
                        >
                            <p className="label-muted">Next project</p>
                            <p
                                className="heading-lg mt-4 transition-colors duration-300
                                           group-hover/next:text-accent"
                            >
                                {next.title}
                            </p>
                            <p className="body-sm mt-4 max-w-xl">
                                {next.thesis}
                            </p>
                            <span
                                className="mono text-xs text-tertiary mt-6 inline-flex items-center gap-2
                                           group-hover/next:text-accent transition-colors duration-300"
                            >
                                Read the write-up
                                <span
                                    aria-hidden="true"
                                    className="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                                               group-hover/next:translate-x-1"
                                >
                                    →
                                </span>
                            </span>
                        </Link>
                    </div>
                </nav>
            )}
        </>
    );
}
