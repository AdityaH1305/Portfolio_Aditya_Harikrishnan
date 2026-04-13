"use client";

import { motion } from "framer-motion";
import ProjectCard, { type ProjectData } from "./ProjectCard";

const projects: ProjectData[] = [
    {
        title: "Ludex",
        tag: "Machine Learning / Research",
        description:
            "Hybrid recommendation system combining content-based filtering and collaborative filtering to deliver personalized Steam game recommendations.",
        highlights: [
            "+27% Precision@20 vs pure CBF",
            "+13% Precision@20 vs pure CF",
            "57K+ items, 1.2K users dataset",
            "Published research paper",
        ],
        github: "https://github.com/Aditya11835/Ludex",
        demo: null,
        image: "/projects/ludex.webp",
    },
    {
        title: "PlaySutra",
        tag: "Full Stack / Data Platform",
        description:
            "Steam analytics platform with real-time pricing, value scoring, and mood-based discovery.",
        highlights: [
            "Real-time Steam API integration",
            "Multi-region price comparison",
            "Custom value score algorithm",
            "Vibe-based game discovery system",
        ],
        github: null,
        demo: null,
        image: "/projects/playsutra.webp",
    },
    {
        title: "Sheriff of Nottingham App",
        tag: "Backend / Multiplayer",
        description:
            "Local multiplayer lobby-based implementation of the Sheriff of Nottingham board game.",
        highlights: [
            "Flask backend",
            "Lobby system for multiplayer",
            "Game state handling",
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
                    Selected work showcasing ML systems and full-stack engineering.
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
