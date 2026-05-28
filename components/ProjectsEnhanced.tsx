"use client";

import { motion } from "framer-motion";
import ProjectCard, { type ProjectData } from "./ProjectCard";

const projects: ProjectData[] = [
    {
        title: "Ludex",
        tag: "Machine Learning / Research",
        description:
            "Hybrid recommendation system architected to fuse content-based and collaborative filtering, ranking personalized Steam game suggestions across a 57K-item catalog — validated through a published research paper.",
        highlights: [
            "+27% Precision@20 vs pure CBF",
            "+13% Precision@20 vs pure CF",
            "57K+ items, 1.2K users dataset",
            "Published research paper",
        ],
        github: "https://github.com/Aditya11835/Ludex",
        demo: "https://ludexsite.onrender.com/",
        images: ["/projects/ludex-new.png", "/projects/ludex2.png", "/projects/ludex3.png"],
    },
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

export default function ProjectsEnhanced() {
    return (
        <section id="projects" className="py-28 px-6 max-w-5xl mx-auto border-t border-[#141418]">
            {/* Heading — left-aligned */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                viewport={{ once: true }}
            >
                <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    Projects
                </h2>
                <p className="text-slate-400 mt-3">
                    Selected work showcasing ML research, data platforms, and full-stack engineering.
                </p>
            </motion.div>

            {/* Projects — increased spacing for breathing room */}
            <motion.div
                className="mt-14 space-y-14"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: 0.2,
                        },
                    },
                }}
            >
                {projects.map((project, index) => (
                    <div key={index} className="relative">
                        {/* Subtle project index */}
                        <span className="absolute -left-0 -top-8 text-[11px] font-mono text-slate-600 tracking-wider">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <ProjectCard project={project} />
                    </div>
                ))}
            </motion.div>
        </section>
    );
}
