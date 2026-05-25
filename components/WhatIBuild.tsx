"use client";

import { motion } from "framer-motion";

export default function WhatIBuild() {
    return (
        <section id="build" className="py-28 px-6 max-w-6xl mx-auto border-t border-[#141418]">

            {/* Heading */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center"
            >
                <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    What I Build
                </h2>
                <p className="text-slate-400 mt-3 max-w-xl mx-auto">
                    I focus on building systems that combine software engineering with machine learning.
                </p>
            </motion.div>

            {/* Cards */}
            <div className="grid md:grid-cols-2 gap-6 mt-16">

                {[
                    {
                        title: "Recommendation Systems",
                        desc: "Hybrid ML models combining collaborative filtering and content-based approaches.",
                    },
                    {
                        title: "Data-Driven Platforms",
                        desc: "Applications powered by real-time APIs, analytics, and custom scoring systems.",
                    },
                    {
                        title: "Scalable Backends",
                        desc: "Modular backend architectures designed for performance and scalability.",
                    },
                    {
                        title: "Intelligent Developer Tools",
                        desc: "Exploring RAG-based systems and tools for understanding large codebases.",
                    },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        viewport={{ once: true }}
                        className={`p-6 rounded-2xl border border-[#1e1e22] bg-[#111113] hover:border-sky-500/30 transition duration-300 hover:-translate-y-0.5`}
                    >
                        <h3 className="text-xl font-semibold">{item.title}</h3>
                        <p className="text-slate-400 mt-2">{item.desc}</p>
                    </motion.div>
                ))}

            </div>
        </section>
    );
}