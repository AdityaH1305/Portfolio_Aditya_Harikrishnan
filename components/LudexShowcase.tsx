"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const Orb = dynamic(() => import("@/components/Orb"), {
    ssr: false,
    loading: () => null,
});

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const metrics = [
    { label: "Precision@20 vs CBF", value: "+27%", emphasis: true },
    { label: "Precision@20 vs CF", value: "+13%", emphasis: false },
    { label: "Items in Dataset", value: "57K+", emphasis: false },
    { label: "Users in Dataset", value: "1.2K", emphasis: false },
];

const techStack = [
    "TF-IDF",
    "Implicit ALS",
    "Content-Based Filtering",
    "Collaborative Filtering",
    "Python",
    "Scikit-learn",
];

/* ── Architecture Diagram Node ── */
function DiagramNode({
    label,
    delay,
    accent = false,
}: {
    label: string;
    delay: number;
    accent?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: EASE }}
            viewport={{ once: true }}
            className={`px-5 py-3 border text-xs mono tracking-wider text-center ${
                accent
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[rgba(255,255,255,0.08)] text-[var(--text-secondary)]"
            }`}
        >
            {label}
        </motion.div>
    );
}

/* ── Arrow between diagram nodes ── */
function DiagramArrow({ delay }: { delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.2 }}
            transition={{ duration: 0.4, delay, ease: EASE }}
            viewport={{ once: true }}
            className="flex justify-center py-2"
        >
            <svg width="2" height="24" viewBox="0 0 2 24">
                <line
                    x1="1"
                    y1="0"
                    x2="1"
                    y2="20"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-[var(--text-tertiary)]"
                />
                <polygon
                    points="0,20 2,20 1,24"
                    fill="currentColor"
                    className="text-[var(--text-tertiary)]"
                />
            </svg>
        </motion.div>
    );
}

export default function LudexShowcase() {
    return (
        <section
            id="work"
            className="relative py-32 md:py-40 border-t border-[rgba(255,255,255,0.04)]"
        >
            <div className="section-container">
                {/* ── Chapter Label ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                >
                    <p className="label">Featured Project</p>
                </motion.div>

                {/* ── Title ── */}
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                    viewport={{ once: true }}
                    className="heading-lg mt-4"
                >
                    Ludex
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
                    viewport={{ once: true }}
                    className="mono text-sm text-[var(--text-tertiary)] mt-2"
                >
                    Machine Learning / Research
                </motion.p>

                {/* ── Narrative: Problem ── */}
                <div className="mt-16 grid lg:grid-cols-2 gap-16 lg:gap-24">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
                            viewport={{ once: true }}
                        >
                            <p className="label mb-4">The Problem</p>
                            <p className="body-lg">
                                Individual recommendation approaches — content-based or
                                collaborative — each have blind spots. Content-based filtering
                                can&apos;t capture user taste. Collaborative filtering
                                suffers from cold-start. Neither alone delivers truly
                                personalized suggestions at scale.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
                            viewport={{ once: true }}
                            className="mt-12"
                        >
                            <p className="label mb-4">The Approach</p>
                            <p className="body-lg">
                                A hybrid recommendation system that fuses{" "}
                                <strong className="text-[var(--foreground)] font-semibold">
                                    TF-IDF vectorization
                                </strong>{" "}
                                across game metadata with{" "}
                                <strong className="text-[var(--foreground)] font-semibold">
                                    implicit ALS (Alternating Least Squares)
                                </strong>{" "}
                                to model latent user–item interactions — combining
                                complementary signals into a unified ranking system.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
                            viewport={{ once: true }}
                            className="mt-12"
                        >
                            <p className="label mb-4">The Impact</p>
                            <p className="body-lg">
                                Evaluated on a dataset of{" "}
                                <strong className="text-[var(--foreground)] font-semibold">
                                    57,000+ items
                                </strong>{" "}
                                and{" "}
                                <strong className="text-[var(--foreground)] font-semibold">
                                    1,200 users
                                </strong>
                                , the hybrid approach significantly outperformed standalone
                                baselines — validated through a published research paper.
                            </p>
                        </motion.div>
                    </div>

                    {/* ── Right: Architecture Diagram + Orb ── */}
                    <div className="flex flex-col items-center justify-center">
                        {/* Orb — integrated as the "engine" center */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            viewport={{ once: true }}
                            className="w-48 h-48 md:w-56 md:h-56 mb-8 hidden lg:block"
                        >
                            <Orb className="w-full h-full" />
                        </motion.div>

                        {/* Architecture flow */}
                        <div className="w-full max-w-xs">
                            <DiagramNode label="USER DATA" delay={0.3} />
                            <DiagramArrow delay={0.4} />
                            <div className="grid grid-cols-2 gap-3">
                                <DiagramNode label="CONTENT-BASED FILTERING" delay={0.5} />
                                <DiagramNode label="COLLABORATIVE FILTERING" delay={0.55} />
                            </div>
                            <DiagramArrow delay={0.6} />
                            <DiagramNode
                                label="HYBRID RECOMMENDATION ENGINE"
                                delay={0.7}
                                accent
                            />
                            <DiagramArrow delay={0.8} />
                            <DiagramNode label="PERSONALIZED RESULTS" delay={0.9} />
                        </div>
                    </div>
                </div>

                {/* ── Media: Videos ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    <div>
                        <p className="label mb-3">Sign In Flow</p>
                        <div className="overflow-hidden border border-[rgba(255,255,255,0.06)] bg-black/50">
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
                        <p className="label mb-3">Dashboard</p>
                        <div className="overflow-hidden border border-[rgba(255,255,255,0.06)] bg-black/50">
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

                {/* ── Metrics ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-14 flex flex-wrap gap-y-6"
                >
                    {metrics.map((m, i) => (
                        <div
                            key={m.label}
                            className={`pr-8 md:pr-12 ${
                                i > 0
                                    ? "pl-8 md:pl-12 border-l border-[rgba(255,255,255,0.06)]"
                                    : ""
                            }`}
                        >
                            <p
                                className={`text-2xl md:text-3xl font-bold ${
                                    m.emphasis
                                        ? "text-[var(--accent)]"
                                        : "text-[var(--foreground)]"
                                }`}
                            >
                                {m.value}
                            </p>
                            <p className="text-[10px] mono uppercase tracking-widest text-[var(--text-tertiary)] mt-1.5">
                                {m.label}
                            </p>
                        </div>
                    ))}
                </motion.div>

                {/* ── Tech Stack ── */}
                <div className="mt-10 flex flex-wrap gap-3">
                    {techStack.map((tech) => (
                        <span
                            key={tech}
                            className="px-4 py-1.5 text-xs mono border border-[rgba(212,175,55,0.15)]
                                       text-[var(--accent)] bg-[rgba(212,175,55,0.03)]"
                        >
                            {tech}
                        </span>
                    ))}
                </div>

                {/* ── Action Links ── */}
                <div className="mt-10 flex flex-wrap gap-4">
                    <a
                        href="https://ludexsite.onrender.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
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
                        className="btn-secondary"
                    >
                        <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.270 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        View on GitHub
                    </a>
                </div>
            </div>
        </section>
    );
}
