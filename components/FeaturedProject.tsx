"use client";

import { motion } from "framer-motion";

const metrics = [
    { label: "Precision@20 vs CBF", value: "+27%", color: "text-emerald-400/80" },
    { label: "Precision@20 vs CF", value: "+13%", color: "text-blue-400/80" },
    { label: "Items in Dataset", value: "57K+", color: "text-purple-400/80" },
    { label: "Users in Dataset", value: "1.2K", color: "text-amber-400/80" },
];

const techStack = [
    "TF-IDF",
    "Implicit ALS",
    "Content-Based Filtering",
    "Collaborative Filtering",
    "Python",
    "Scikit-learn",
];

export default function FeaturedProject() {
    return (
        <section id="featured-project" className="py-28 px-6 max-w-5xl mx-auto border-t border-[#141418]">
            {/* Label + Title — left-aligned, editorial */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
            >
                <p className="text-xs text-sky-400 font-mono tracking-widest uppercase">
                    Highlight
                </p>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-2">
                    Ludex
                </h2>
                <p className="text-sm text-slate-500 font-mono mt-1.5">
                    Machine Learning / Research
                </p>
            </motion.div>

            {/* Description — tight after header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="mt-8 space-y-3.5 text-slate-300 leading-[1.75] max-w-2xl"
            >
                <p>
                    A hybrid recommendation system that fuses <strong className="text-white">content-based filtering</strong> with{" "}
                    <strong className="text-white">collaborative filtering</strong> to deliver
                    highly personalized Steam game recommendations at scale.
                </p>
                <p>
                    The content pipeline leverages <strong className="text-white">TF-IDF vectorization</strong> across
                    game metadata, while the collaborative component uses{" "}
                    <strong className="text-white">implicit ALS (Alternating Least Squares)</strong> to
                    model latent user–item interactions — combining the best of both
                    paradigms into a single, unified ranking system.
                </p>
                <p>
                    Evaluated on a dataset of <strong className="text-white">57,000+ items</strong> and{" "}
                    <strong className="text-white">1,200 users</strong>, the hybrid approach
                    significantly outperforms standalone baselines, demonstrating
                    that thoughtful fusion of complementary signals yields
                    measurably better recommendations.
                </p>
            </motion.div>

            {/* Media — contained, below description */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                viewport={{ once: true }}
                className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5"
            >
                <div>
                    <p className="text-slate-500 text-[11px] font-mono uppercase tracking-wider mb-2.5">Sign In Flow</p>
                    <div className="rounded-lg overflow-hidden border border-[#18181c] shadow-sm shadow-black/20">
                        <video
                            src="/projects/sign_in.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-auto"
                        />
                    </div>
                </div>
                <div>
                    <p className="text-slate-500 text-[11px] font-mono uppercase tracking-wider mb-2.5">Dashboard</p>
                    <div className="rounded-lg overflow-hidden border border-[#18181c] shadow-sm shadow-black/20">
                        <video
                            src="/projects/dashboard.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-auto"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Metrics — inline row with left-border dividers, toned colors */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="mt-10 flex flex-wrap gap-y-5"
            >
                {metrics.map((m, i) => (
                    <div
                        key={m.label}
                        className={`pr-6 md:pr-8 ${i > 0 ? "pl-6 md:pl-8 border-l border-[#1e1e22]" : ""}`}
                    >
                        <p className={`text-xl md:text-2xl font-semibold ${m.color}`}>
                            {m.value}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase tracking-wider">
                            {m.label}
                        </p>
                    </div>
                ))}
            </motion.div>

            {/* Tech stack pills */}
            <div className="mt-8 flex flex-wrap gap-2.5">
                {techStack.map((tech) => (
                    <span
                        key={tech}
                        className="px-3.5 py-1.5 text-xs font-mono rounded-full border border-[#1e1e22] text-slate-400"
                    >
                        {tech}
                    </span>
                ))}
            </div>

            {/* Action links — Visit Site primary, GitHub secondary */}
            <div className="mt-7 flex flex-wrap gap-3">
                <a
                    href="https://ludexsite.onrender.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:scale-[1.03] transition-all duration-200"
                >
                    <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path d="M14 3h7v7" />
                        <path d="M10 14L21 3" />
                        <path d="M21 14v7h-7" />
                        <path d="M3 10v11h11" />
                    </svg>
                    Visit Site
                </a>

                <a
                    href="https://github.com/Aditya11835/Ludex"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#2a2a30] text-sm font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-all duration-200"
                >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.270 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    View on GitHub
                </a>
            </div>
        </section>
    );
}
