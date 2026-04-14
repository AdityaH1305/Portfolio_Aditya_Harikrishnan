"use client";

import { motion } from "framer-motion";

const projects = [
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
        github: "https://github.com/AdityaH1305/steam_db-clone",
        demo: null,
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
    },
];

export default function Projects() {
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
                    <motion.div
                        key={index}
                        variants={{
                            hidden: { opacity: 0, y: 40 },
                            visible: { opacity: 1, y: 0 },
                        }}
                        className="p-8 rounded-2xl border border-slate-800 hover:border-white/30 transition duration-300"
                    >

                        {/* Title */}
                        <div className="flex flex-col md:flex-row md:justify-between gap-2">
                            <h3 className="text-2xl font-semibold">
                                {project.title}
                            </h3>
                            <span className="text-sm text-blue-400 font-mono">
                                {project.tag}
                            </span>
                        </div>

                        {/* Description */}
                        <p className="text-slate-400 mt-4 max-w-3xl">
                            {project.description}
                        </p>

                        {/* Highlights */}
                        <ul className="mt-6 grid md:grid-cols-2 gap-2 text-sm text-slate-300">
                            {project.highlights.map((item, i) => (
                                <li key={i}>• {item}</li>
                            ))}
                        </ul>

                        {/* Buttons */}
                        <div className="mt-6 flex gap-4 flex-wrap">
                            {project.github && (
                                <a
                                    href={project.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-5 py-2 rounded-full border border-slate-600 text-sm hover:bg-white hover:text-black transition"
                                >
                                    GitHub
                                </a>
                            )}

                            {project.demo && (
                                <a
                                    href={project.demo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-5 py-2 rounded-full bg-white text-black text-sm hover:scale-105 transition"
                                >
                                    Live Demo
                                </a>
                            )}
                        </div>

                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
}