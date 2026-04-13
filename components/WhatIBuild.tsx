"use client";

import { motion } from "framer-motion";

export default function WhatIBuild() {
    return (
        <section id="build" className="py-24 px-6 max-w-6xl mx-auto">

            {/* Heading */}
            <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-semibold">
                    What I Build
                </h2>
                <p className="text-slate-400 mt-3 max-w-xl mx-auto">
                    I focus on building systems that combine software engineering with machine learning.
                </p>
            </div>

            {/* Cards */}
            <div className="grid md:grid-cols-2 gap-6 mt-14">

                {[
                    {
                        title: "Recommendation Systems",
                        desc: "Hybrid ML models combining collaborative filtering and content-based approaches.",
                        color: "hover:border-blue-500",
                    },
                    {
                        title: "Data-Driven Platforms",
                        desc: "Applications powered by real-time APIs, analytics, and custom scoring systems.",
                        color: "hover:border-purple-500",
                    },
                    {
                        title: "Scalable Backends",
                        desc: "Modular backend architectures designed for performance and scalability.",
                        color: "hover:border-pink-500",
                    },
                    {
                        title: "Intelligent Developer Tools",
                        desc: "Exploring RAG-based systems and tools for understanding large codebases.",
                        color: "hover:border-green-500",
                    },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        viewport={{ once: true }}
                        className={`p-6 rounded-2xl border border-slate-800 ${item.color} transition duration-300 hover:scale-[1.02]`}
                    >
                        <h3 className="text-xl font-semibold">{item.title}</h3>
                        <p className="text-slate-400 mt-2">{item.desc}</p>
                    </motion.div>
                ))}

            </div>
        </section>
    );
}