"use client";

import { motion } from "framer-motion";
import ProjectCard, { type ProjectData } from "./ProjectCard";

/* ══════════════════════════════════════════════════════
   Projects Section — Immersive Chapter-Style
   
   Ludex is excluded here (it has LudexShowcase).
   Remaining projects displayed as full-width immersive chapters.
   All project data, links, images preserved exactly.
   ══════════════════════════════════════════════════════ */

const projects: ProjectData[] = [
    {
        title: "PlayNexus",
        tag: "Full Stack / Data Platform",
        description:
            "Full-stack data platform with a multi-region price aggregation pipeline, custom value-scoring algorithm, and vibe-based discovery — engineered for data-driven decision making at scale.",
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
    },
    {
        title: "SynthRescue",
        tag: "AI / Computer Vision",
        description:
            "Real-time structural damage assessment pipeline combining YOLO-based detection with AI-assisted triage — generates actionable emergency reports for rapid deployment in disaster response environments.",
        highlights: [
            "Real-time image upload and analysis pipeline",
            "YOLO-based structural damage detection",
            "AI-generated emergency response reports using Gemini",
            "Fault-tolerant fallback system for reliability under failure conditions",
            "Designed for rapid deployment in disaster response environments",
        ],
        github: "https://github.com/AdityaH1305/SynthRescue",
        demo: null,
        images: ["/projects/synth1.png", "/projects/synth2.png"],
    },
    {
        title: "Sheriff of Nottingham App",
        tag: "Backend / Multiplayer",
        description:
            "Multiplayer game engine with lobby management, real-time state synchronization over WebSockets, and turn-based game logic — a digital adaptation of the Sheriff of Nottingham board game.",
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

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function ProjectsEnhanced() {
    return (
        <section id="projects" className="py-20 md:py-28">
            {/* Section heading */}
            <div className="section-container">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                >
                    <p className="label">Selected Work</p>
                    <h2 className="heading-lg mt-3">Projects</h2>
                    <p className="body-sm mt-3 max-w-lg text-[var(--text-tertiary)]">
                        ML research, data platforms, and full-stack engineering.
                    </p>
                </motion.div>
            </div>

            {/* Project chapters */}
            <div className="mt-8">
                {projects.map((project, index) => (
                    <ProjectCard
                        key={project.title}
                        project={project}
                        index={index + 1}
                    />
                ))}
            </div>
        </section>
    );
}
