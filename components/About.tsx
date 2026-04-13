"use client";

import { motion } from "framer-motion";

export default function About() {
    return (
        <section id="about" className="py-24 px-6 max-w-5xl mx-auto">

            {/* Heading */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center"
            >
                <h2 className="text-3xl md:text-4xl font-semibold">
                    About Me
                </h2>
                <p className="text-slate-400 mt-3">
                    A bit about who I am and how I approach building systems.
                </p>
            </motion.div>

            {/* Content */}
            <div className="mt-12 grid md:grid-cols-2 gap-10 items-center">

                {/* Left: Text */}
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="space-y-5 text-slate-300 leading-relaxed"
                >
                    <p>
                        I'm a Computer Science student at IIIT Pune focused on building systems
                        that combine software engineering with machine learning.
                    </p>

                    <p>
                        My work centers around recommendation systems, data-driven platforms,
                        and scalable backend architectures. I enjoy taking complex problems
                        and turning them into structured, efficient solutions.
                    </p>

                    <p>
                        Recently, I've been exploring retrieval-augmented generation (RAG),
                        embeddings, and graph-based approaches to understanding large codebases.
                    </p>

                    <p className="text-white font-medium">
                        I’m especially interested in building tools that make complex systems
                        easier to understand and interact with.
                    </p>
                </motion.div>

                {/* Right: Info Cards */}
                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="grid gap-4"
                >

                    <div className="p-5 rounded-xl border border-slate-800">
                        <p className="text-sm text-slate-400">Education</p>
                        <p className="font-medium mt-1">
                            B.Tech CSE — IIIT Pune
                        </p>
                    </div>

                    <div className="p-5 rounded-xl border border-slate-800">
                        <p className="text-sm text-slate-400">Focus</p>
                        <p className="font-medium mt-1">
                            ML Systems • Full Stack • Backend Engineering
                        </p>
                    </div>

                    <div className="p-5 rounded-xl border border-slate-800">
                        <p className="text-sm text-slate-400">Currently Exploring</p>
                        <p className="font-medium mt-1">
                            RAG • Embeddings • Code Intelligence Systems
                        </p>
                    </div>

                </motion.div>
            </div>
        </section>
    );
}