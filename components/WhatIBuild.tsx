"use client";

import { motion } from "framer-motion";

const items = [
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
];

/* ── Stagger animation variants ── */
const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
        },
    },
};

export default function WhatIBuild() {
    return (
        <section id="build" className="py-24 px-6 max-w-5xl mx-auto border-t border-[#141418]">

            {/* Heading — left-aligned */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                viewport={{ once: true }}
            >
                <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    What I Build
                </h2>
                <p className="text-slate-400 mt-3 max-w-xl">
                    I focus on building systems that combine software engineering with machine learning.
                </p>
            </motion.div>

            {/* Items — staggered scroll-reveal cascade */}
            <motion.div
                className="grid md:grid-cols-2 gap-x-12 gap-y-10 mt-12"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
            >
                {items.map((item, i) => (
                    <motion.div
                        key={i}
                        variants={itemVariants}
                        className="pl-5 border-l-2 border-[#1e1e22]"
                    >
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                        <p className="text-slate-400 mt-1.5 text-sm leading-relaxed">{item.desc}</p>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
}