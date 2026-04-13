"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export interface ProjectData {
    title: string;
    tag: string;
    description: string;
    highlights: string[];
    github: string | null;
    demo: string | null;
    image?: string;
}

export default function ProjectCard({
    project,
}: {
    project: ProjectData;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0 },
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="group relative rounded-2xl border border-slate-800 hover:border-white/30 transition duration-300 overflow-hidden"
        >
            <div className="flex flex-col md:flex-row">
                {/* Content */}
                <div className="p-8 flex-1">
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
                </div>

                {/* Image Preview (slides in on hover) */}
                {project.image && (
                    <div
                        className={`
                            hidden md:flex items-center justify-center
                            w-0 group-hover:w-72 overflow-hidden
                            transition-all duration-500 ease-out
                            bg-slate-900/50 border-l border-slate-800/50
                        `}
                    >
                        <div className={`
                            relative w-60 h-40 rounded-lg overflow-hidden
                            transition-all duration-500 delay-100
                            ${hovered ? "opacity-100 scale-100" : "opacity-0 scale-95"}
                        `}>
                            <Image
                                src={project.image}
                                alt={`${project.title} preview`}
                                fill
                                className="object-cover rounded-lg"
                                sizes="240px"
                            />
                        </div>
                    </div>
                )}

                {/* Mobile image (above content) */}
                {project.image && (
                    <div className="md:hidden relative w-full h-48 border-t border-slate-800/50">
                        <Image
                            src={project.image}
                            alt={`${project.title} preview`}
                            fill
                            className="object-cover"
                            sizes="100vw"
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
}
