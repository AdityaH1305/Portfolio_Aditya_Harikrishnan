"use client";

import { motion } from "framer-motion";
import ProjectCard, { type ProjectData } from "./ProjectCard";

const projects: ProjectData[] = [
    {
        title: "Ludex",
        tag: "Machine Learning / Research",
        description:
            "Hybrid recommendation engine fusing content-based and collaborative filtering to surface personalized Steam game picks — backed by a published research paper.",
        highlights: [
            "+27% Precision@20 vs pure CBF",
            "+13% Precision@20 vs pure CF",
            "57K+ items, 1.2K users dataset",
            "Published research paper",
        ],
        github: "https://github.com/Aditya11835/Ludex",
        demo: "https://ludexsite.onrender.com/",
        image: "/projects/ludex-new.png",
    },
    {
        title: "LudoScope",
        tag: "Full Stack / Data Platform",
        description:
            "Real-time Steam analytics dashboard with multi-region price comparison, a custom value-scoring algorithm, and vibe-based game discovery — built for data-driven decision making.",
        highlights: [
            "Real-time Steam API integration",
            "Multi-region price comparison",
            "Custom value score algorithm",
            "Vibe-based game discovery system",
        ],
        github: "https://github.com/AdityaH1305/LudoScope",
        demo: "https://ludoscope.vercel.app/",
        image: "/projects/LudoScope-new.png",
    },
    {
        title: "Sheriff of Nottingham App",
        tag: "Backend / Multiplayer",
        description:
            "Digital adaptation of the Sheriff of Nottingham board game with a lobby-based multiplayer system, real-time game state management, and turn-by-turn logic.",
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
        <section id="projects" className="py-24 px-6 max-w-6xl mx-auto">
            {/* Heading */}
            <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-semibold">
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
