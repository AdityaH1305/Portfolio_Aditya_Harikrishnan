"use client";

import { motion } from "framer-motion";
import {
    PlayNexusShowcase,
    CompactProjectCard,
    type ProjectData,
} from "./ProjectCard";

/* ══════════════════════════════════════════════════════
   Projects Section — Curated Hierarchy

   Visual hierarchy:
   Tier 1: Ludex (handled by LudexShowcase, not here)
   Tier 2: PlayNexus — expanded showcase, vertical flow
   Tier 3: SynthRescue + Sheriff — compact evidence strip

   Design rationale:
   - PlayNexus gets a full showcase with hero image,
     thumbnail navigation, and editorial layout
   - Supporting projects are presented as a 2-column
     grid of compact cards, scannable in seconds
   - This breaks the repetitive chapter pattern and
     creates clear visual tiers
   - Section heading omits the eyebrow label to stay
     under the eyebrow budget (Ludex already has one)
   ══════════════════════════════════════════════════════ */

const playnexus: ProjectData = {
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
        "/projects/playnexus2.png",
        "/projects/playnexus-new.png",
        "/projects/playnexus3.png",
        "/projects/playnexus4.png",
        "/projects/playnexus5.png",
    ],
};

const supportingProjects: ProjectData[] = [
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
        images: ["/projects/synth1.png", "/projects/synth2.png"],
    },
    {
        title: "Sheriff of Nottingham App",
        tag: "Backend / Multiplayer",
        description:
            "Multiplayer game engine with lobby management, real-time state synchronization over WebSockets, and turn-based game logic.",
        highlights: [
            "Flask backend with WebSocket support",
            "Lobby system for multiplayer sessions",
            "Turn-based game state handling",
        ],
        github: "https://github.com/AdityaH1305/Sheriff-of-nottingham-app",
        demo: null,
        image: "/projects/sheriff.webp",
    },
];

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export default function ProjectsEnhanced() {
    return (
        <section id="projects" className="py-20 md:py-28">
            {/* Section heading — no eyebrow to stay under budget */}
            <div className="section-container">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                >
                    <h2 className="heading-lg">Projects</h2>
                    <p className="body-sm mt-3 max-w-lg text-[var(--text-tertiary)]">
                        ML research, data platforms, and full-stack engineering.
                    </p>
                </motion.div>
            </div>

            {/* ═══ Tier 2: PlayNexus Showcase ═══ */}
            <div className="mt-14 md:mt-20">
                <PlayNexusShowcase project={playnexus} />
            </div>

            {/* ═══ Tier 3: Supporting Evidence Strip ═══ */}
            <div className="section-container">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-24 md:mt-32 mb-4"
                >
                    <div className="compact-section-divider" />
                </motion.div>

                <div className="compact-grid">
                    {supportingProjects.map((project, i) => (
                        <CompactProjectCard
                            key={project.title}
                            project={project}
                            index={i}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
