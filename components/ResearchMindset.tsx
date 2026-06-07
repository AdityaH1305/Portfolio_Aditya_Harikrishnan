"use client";

import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════
   Research Mindset Section
   
   Communicates engineering thinking rather than listing skills.
   Themes: Research, Experimentation, Measurement, Iteration.
   Concise and highly visual.
   ══════════════════════════════════════════════════════ */

const pillars = [
    {
        number: "01",
        title: "Research",
        description:
            "Every system begins with understanding the problem space. I study prior work, identify patterns, and find where existing approaches fall short.",
    },
    {
        number: "02",
        title: "Experimentation",
        description:
            "Build fast prototypes. Test hypotheses. Explore multiple approaches before committing to architecture — from ML model variants to API design patterns.",
    },
    {
        number: "03",
        title: "Measurement",
        description:
            "Define clear metrics. Evaluate against baselines. Precision@20, response times, scalability benchmarks — results determine direction, not intuition.",
    },
    {
        number: "04",
        title: "Iteration",
        description:
            "Ship, observe, refine. Systems improve through cycles of feedback and focused improvement. The first version is never the final version.",
    },
];

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function ResearchMindset() {
    return (
        <section
            id="research"
            className="py-28 md:py-36 border-t border-[rgba(255,255,255,0.04)]"
        >
            <div className="section-container">
                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                >
                    <p className="label">How I Think</p>
                    <h2 className="heading-lg mt-3">Research Mindset</h2>
                    <p className="body-sm mt-3 max-w-lg text-[var(--text-tertiary)]">
                        Engineering is a process, not just a product.
                    </p>
                </motion.div>

                {/* ── Pillars — 4 column editorial grid ── */}
                <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-[rgba(255,255,255,0.04)]">
                    {pillars.map((pillar, i) => (
                        <motion.div
                            key={pillar.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.5,
                                delay: i * 0.08,
                                ease: EASE,
                            }}
                            viewport={{ once: true }}
                            className="bg-[#050505] p-8 lg:p-10 group"
                        >
                            <span className="mono text-xs text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors duration-300">
                                {pillar.number}
                            </span>
                            <h3 className="heading-sm mt-4 group-hover:text-[var(--accent)] transition-colors duration-300">
                                {pillar.title}
                            </h3>
                            <p className="body-sm mt-4">{pillar.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
