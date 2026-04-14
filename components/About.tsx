"use client";

import { motion } from "framer-motion";

export default function About() {
    return (
        <section id="about" className="py-24 px-6 max-w-6xl mx-auto">

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
                    Engineer first, researcher close second — here's the short version.
                </p>
            </motion.div>

            {/* Content */}
            <div className="mt-14 grid md:grid-cols-2 gap-12 items-start">

                {/* Left: Text */}
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="space-y-5 text-slate-300 leading-relaxed"
                >
                    <p>
                        I&apos;m a Computer Science undergrad at IIIT Pune
                        who builds at the intersection of software engineering
                        and machine learning — from recommendation systems that
                        outperform baselines to full-stack data platforms serving
                        real-time analytics.
                    </p>

                    <p>
                        My approach: take a complex, messy problem, architect a
                        clean solution, then ship it. I care about scalable backends,
                        well-designed APIs, and ML systems that actually work in
                        production — not just in a notebook.
                    </p>

                    <p>
                        Currently diving deeper into retrieval-augmented generation,
                        embedding-based search, and graph-powered code intelligence
                        systems.
                    </p>

                    <p className="text-white font-medium">
                        I&apos;m drawn to tools that decode complexity — making
                        large systems legible, navigable, and interactive.
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
                    <div className="p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors duration-200">
                        <p className="text-sm text-slate-500 font-mono uppercase tracking-wider">Education</p>
                        <p className="font-medium mt-1.5">
                            B.Tech CSE — IIIT Pune
                        </p>
                    </div>

                    <div className="p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors duration-200">
                        <p className="text-sm text-slate-500 font-mono uppercase tracking-wider">Focus Areas</p>
                        <p className="font-medium mt-1.5">
                            ML Systems • Full Stack • Backend Engineering
                        </p>
                    </div>

                    <div className="p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors duration-200">
                        <p className="text-sm text-slate-500 font-mono uppercase tracking-wider">Currently Exploring</p>
                        <p className="font-medium mt-1.5">
                            RAG • Embeddings • Code Intelligence
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}