"use client";

import { motion } from "framer-motion";
import ProjectCard, { type ProjectData } from "./ProjectCard";

const projects: ProjectData[] = [
    {
        title: "Ludex",
        tag: "Machine Learning / Research",
        description:
            "Hybrid recommendation engine that fuses content-based and collaborative filtering to rank personalized Steam game suggestions across a 57K-item catalog — backed by a published research paper.",
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
            "Real-time Steam analytics platform with multi-region price aggregation, a custom value-scoring algorithm, and vibe-based discovery — engineered for data-driven decision making at scale.",
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
            "Designed to accelerate structural assessment during disaster response — combines YOLO-based damage detection with AI-assisted reasoning to generate actionable emergency reports in real time.",
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
            "Digital adaptation of the Sheriff of Nottingham board game — features lobby-based multiplayer, real-time state synchronization via WebSockets, and turn-by-turn game logic.",
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
        <section id="projects" className="py-28 px-6 max-w-6xl mx-auto border-t border-[#141418]">
            {/* Heading */}
            <div className="text-center">
                <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    Projects
                </h2>
                <p className="text-slate-400 mt-3">
                    Selected work showcasing ML research, data platforms, and full-stack engineering.
                </p>
            </div>

            {/* Projects */}
            <motion.div
                className="mt-16 space-y-12"
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
                    <ProjectCard key={index} project={project} />
                ))}
            </motion.div>
        </section>
    );
}
