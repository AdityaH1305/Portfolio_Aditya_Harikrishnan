"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import Lightbox from "@/components/Lightbox";

/* ══════════════════════════════════════════════════════
   Projects Section — Balanced Two-Column Composition

   Visual hierarchy (non-negotiable):
   Tier 1: Ludex — full immersive case study (LudexShowcase)
   Tier 2: PlayNexus + SynthRescue — balanced companion
           projects in a matched 2-column grid

   Design rationale:
   - Equal-width columns (6:6) give both projects the
     same visual importance — they are companions, not
     a primary and its subordinate
   - Both cards share identical architecture: same bezel
     scale, heading size (heading-sm), tag style, image
     aspect ratio, highlight format, and CTA format
   - Natural variation comes from content (different
     images, descriptions, tags), not structural inequality
   - Both use compact-link CTAs (not pill buttons),
     creating a clear collective step-down from Ludex's
     btn-primary/btn-secondary treatment
   - No eyebrow label (Ludex uses the budget)
   - Section heading uses heading-lg (vs Ludex heading-xl)

   Skills applied:
   - design-taste-frontend: editorial magazine layout,
     identical containers with different stories, no
     repetitive chapter pattern, no dashboard grid
   - high-end-visual-design: double-bezel containers,
     custom cubic-bezier [0.32, 0.72, 0, 1], macro
     whitespace, button-in-button not needed (compact
     links are the right weight here)
   - full-output-enforcement: complete implementation,
     no placeholders, no truncation
   ══════════════════════════════════════════════════════ */

interface ProjectData {
    title: string;
    tag: string;
    description: string;
    highlights: string[];
    github: string;
    demo: string | null;
    images: string[];
}


const projects: ProjectData[] = [
    {
        title: "PlayNexus",
        tag: "Full Stack / Data Platform",
        description:
            "Full-stack data platform with a multi-region price aggregation pipeline, custom value-scoring algorithm, and vibe-based discovery. Engineered for data-driven decision making at scale.",
        highlights: [
            "Real-time Steam API integration",
            "Multi-region price comparison",
            "Custom value score algorithm",
            "Vibe-based game discovery system",
        ],
        github: "https://github.com/AdityaH1305/PlayNexus",
        demo: "https://playnexus-io.vercel.app",
        images: [
            "/projects/playnexus2.webp",
            "/projects/playnexus-new.webp",
            "/projects/playnexus3.webp",
            "/projects/playnexus4.webp",
            "/projects/playnexus5.webp",
        ],
    },
    {
        title: "SynthRescue",
        tag: "AI / Computer Vision",
        description:
            "Real-time structural damage assessment pipeline combining YOLO-based detection with AI-assisted triage for rapid deployment in disaster response.",
        highlights: [
            "Real-time image upload and analysis pipeline",
            "YOLO-based structural damage detection",
            "AI-generated emergency response reports using Gemini",
        ],
        github: "https://github.com/AdityaH1305/SynthRescue",
        demo: "https://synthrescue.vercel.app/",
        images: ["/projects/synth1.webp", "/projects/synth2.webp"],
    },
];

/* ═══════════════════════════════════════════════════════
   ProjectCard — Shared card architecture

   Both PlayNexus and SynthRescue use this component.
   Identical structure ensures visual parity:
   - Double-bezel hero image (16:10 aspect)
   - Click-to-lightbox with gallery navigation
   - Compact tag + heading-sm title
   - Body description (unclamped — let content breathe)
   - Highlight list with gold dash markers
   - Compact-link CTAs (GitHub + optional Live Demo)

   The stagger index controls entrance animation delay
   so the two cards reveal in sequence left-to-right.
   ═══════════════════════════════════════════════════════ */
function ProjectCard({
    project,
    staggerIndex,
}: {
    project: ProjectData;
    staggerIndex: number;
}) {
    /* null = closed. Tracking the index alone avoids keeping src and index
       in sync as two pieces of state. */
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const lightboxImages = project.images.map((src, i) => ({
        src,
        alt: `${project.title} screenshot ${i + 1} of ${project.images.length}`,
    }));

    const openLightbox = (idx: number) => setLightboxIndex(idx);

    const baseDelay = staggerIndex * 0.1;

    return (
        <div>
            {/* Hero image in double-bezel */}
            <Reveal y={28} duration={0.8} delay={0.06 + baseDelay}>
                <div className="shell-bezel compact-bezel">
                    <div className="core-bezel overflow-hidden">
                        <div
                            data-cursor="zoom"
                            className="relative w-full aspect-[16/10] cursor-pointer group/card-img"
                            onClick={() => openLightbox(0)}
                        >
                            <Image
                                src={project.images[0]}
                                alt={`${project.title} preview`}
                                fill
                                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/card-img:scale-[1.02]"
                                sizes="(max-width: 768px) 100vw, 50vw"
                                /* `priority` is deprecated as of Next 16 in
                                   favour of `preload`, which says what it
                                   actually does. */
                                preload={staggerIndex === 0}
                            />
                            {project.images.length > 1 && (
                                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-surface-0/85 border border-edge-default text-[10px] mono text-tertiary">
                                    +{project.images.length - 1} more
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Reveal>

            {/* Content */}
            <Reveal y={14} delay={0.16 + baseDelay} className="mt-7">
                {/* label-muted, not a bespoke `compact-tag`: the design system
                    declares exactly two micro-label classes, and this is the
                    same semantic slot CaseStudyHero fills with label-muted. */}
                <span className="label-muted block">{project.tag}</span>
                <h3 className="heading-sm mt-2.5">{project.title}</h3>
                <p className="body-sm mt-3">{project.description}</p>

                {/* Highlights */}
                <ul className="mt-5 space-y-2.5">
                    {project.highlights.map((item, i) => (
                        <li
                            key={i}
                            className="flex items-start gap-2.5 text-[13px] text-secondary leading-snug"
                        >
                            <span className="text-accent mt-0.5 text-[10px] shrink-0">
                                ─
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>

                {/* CTA links */}
                <div className="mt-7 flex gap-4 items-center">
                    <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="compact-link"
                    >
                        <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                        >
                            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        GitHub
                    </a>
                    {project.demo && (
                        <a
                            href={project.demo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="compact-link compact-link--accent"
                        >
                            <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                viewBox="0 0 24 24"
                            >
                                <path d="M7 17L17 7M17 7H7M17 7v10" />
                            </svg>
                            Live Demo
                        </a>
                    )}
                </div>
            </Reveal>

            {lightboxIndex !== null && (
                <Lightbox
                    images={lightboxImages}
                    index={lightboxIndex}
                    onNavigate={setLightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   Main Section — Balanced Two-Column Composition
   ══════════════════════════════════════════════════════ */
export default function ProjectsEnhanced() {
    return (
        <section id="projects" className="section-y section-divide">
            {/* Section heading */}
            <div className="section-container">
                <Reveal y={16}>
                    <p className="label">Projects</p>
                    <h2 className="heading-lg mt-3">More Work</h2>
                    <p className="body-lg mt-4 max-w-lg">
                        Data platforms, applied AI, and full-stack engineering.
                    </p>
                </Reveal>
            </div>

            {/* Balanced 2-column grid */}
            <div className="section-container">
                <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8 lg:gap-10 items-start">
                    {projects.map((project, i) => (
                        <ProjectCard
                            key={project.title}
                            project={project}
                            staggerIndex={i}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
