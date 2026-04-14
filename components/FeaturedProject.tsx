"use client";

import { motion } from "framer-motion";

const metrics = [
    { label: "Precision@20 vs CBF", value: "+27%", color: "text-emerald-400" },
    { label: "Precision@20 vs CF", value: "+13%", color: "text-blue-400" },
    { label: "Items in Dataset", value: "57K+", color: "text-purple-400" },
    { label: "Users in Dataset", value: "1.2K", color: "text-amber-400" },
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
        <section id="featured-project" className="py-24 px-6 max-w-6xl mx-auto">
            {/* Heading */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center"
            >
                <p className="text-sm text-purple-400 font-mono tracking-widest uppercase">
                    Highlight
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold mt-2">
                    Featured Project
                </h2>
            </motion.div>

            {/* Card */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                viewport={{ once: true }}
                className="mt-14 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/60 to-slate-950/80 overflow-hidden"
            >
                <div className="p-8 md:p-12">
                    {/* Header row */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">
                                Ludex
                            </h3>
                            <p className="text-sm text-purple-400 font-mono mt-1">
                                Machine Learning / Research
                            </p>
                        </div>
                        <a
                            href="https://github.com/Aditya11835/Ludex"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-600 text-sm font-medium hover:bg-white hover:text-black transition-all duration-200 self-start"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            View on GitHub
                        </a>
                    </div>

                    {/* Description */}
                    <div className="mt-8 space-y-4 text-slate-300 leading-relaxed max-w-3xl">
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
                    </div>

                    {/* Metrics */}
                    <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {metrics.map((m) => (
                            <div
                                key={m.label}
                                className="p-4 rounded-xl border border-slate-800 bg-black/30 text-center"
                            >
                                <p className={`text-2xl md:text-3xl font-bold ${m.color}`}>
                                    {m.value}
                                </p>
                                <p className="text-xs text-slate-500 mt-1.5 font-mono uppercase tracking-wider">
                                    {m.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Tech stack pills */}
                    <div className="mt-8 flex flex-wrap gap-2">
                        {techStack.map((tech) => (
                            <span
                                key={tech}
                                className="px-3 py-1 text-xs font-mono rounded-full border border-slate-700 text-slate-400 bg-slate-900/50"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
