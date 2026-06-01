"use client";

import { motion } from "framer-motion";

export default function About() {
    return (
        <section id="about" className="py-28 px-6 max-w-5xl mx-auto border-t border-zinc-900 signal-divider">

            {/* Heading — left-aligned */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                viewport={{ once: true }}
            >
                <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-100">
                    About Me
                </h2>
                <p className="text-zinc-500 mt-3">
                    Engineer first, researcher close second — here's the short version.
                </p>
            </motion.div>

            {/* Content */}
            <div className="mt-12 grid md:grid-cols-2 gap-12 items-start">

                {/* Left: Text */}
                <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    viewport={{ once: true }}
                    className="space-y-5 text-zinc-400 leading-[1.75]"
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

                    <p className="text-white font-semibold">
                        I&apos;m drawn to tools that decode complexity — making
                        large systems legible, navigable, and interactive.
                    </p>
                </motion.div>

                {/* Right: Info — ruled lines instead of cards */}
                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                    viewport={{ once: true }}
                    className="grid gap-0"
                >
                    <div className="py-5 border-b border-zinc-900 hover:border-sky-400 transition-colors duration-200">
                        <p className="text-sm text-sky-400/70 font-mono uppercase tracking-wider font-medium">Education</p>
                        <p className="font-medium mt-1.5 text-zinc-200">
                            B.Tech CSE — IIIT Pune
                        </p>
                    </div>

                    <div className="py-5 border-b border-zinc-900 hover:border-sky-400 transition-colors duration-200">
                        <p className="text-sm text-sky-400/70 font-mono uppercase tracking-wider font-medium">Focus Areas</p>
                        <p className="font-medium mt-1.5 text-zinc-200">
                            ML Systems • Full Stack • Backend Engineering
                        </p>
                    </div>

                    <div className="py-5 border-b border-zinc-900 hover:border-sky-400 transition-colors duration-200">
                        <p className="text-sm text-sky-400/70 font-mono uppercase tracking-wider font-medium">Currently Exploring</p>
                        <p className="font-medium mt-1.5 text-zinc-200">
                            RAG • Embeddings • Code Intelligence
                        </p>
                    </div>

                    <div className="py-5 hover:border-sky-400 transition-colors duration-200 border-b border-transparent">
                        <p className="text-sm text-sky-400/70 font-mono uppercase tracking-wider font-medium">Status</p>
                        <p className="font-medium mt-1.5 text-zinc-200">
                            Available for Opportunities
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}