"use client";

import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════
   Skills Section — Editorial Layout
   
   Supporting information — reduced visual prominence.
   No progress bars, no percentages, no radial charts.
   Confident, editorial, restrained typography.
   ══════════════════════════════════════════════════════ */

const skillGroups = [
    {
        category: "Systems",
        skills: ["Python", "Java", "C", "C++", "Flask", "Node.js"],
    },
    {
        category: "Machine Learning",
        skills: [
            "Collaborative Filtering",
            "Content-Based Filtering",
            "Deep Learning",
            "Scikit-learn",
        ],
    },
    {
        category: "Frontend",
        skills: ["JavaScript", "React", "Next.js", "HTML", "CSS"],
    },
    {
        category: "Data & Infrastructure",
        skills: ["MySQL", "SQL", "MongoDB", "Cloud Computing", "Distributed Systems"],
    },
    {
        category: "Fundamentals",
        skills: [
            "Data Structures",
            "Algorithms",
            "Operating Systems",
            "DBMS",
            "Computer Networks",
            "Cryptography",
        ],
    },
];

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function Skills() {
    return (
        <section className="py-20 md:py-28 border-t border-[rgba(255,255,255,0.04)]">
            <div className="section-container">
                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                >
                    <p className="label">Technologies</p>
                    <h2 className="heading-md mt-3">Skills &amp; Tools</h2>
                </motion.div>

                {/* ── Skill Groups — editorial columns ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-10"
                >
                    {skillGroups.map((group) => (
                        <div key={group.category}>
                            <h3 className="text-xs mono uppercase tracking-[0.15em] text-[var(--accent)] mb-4">
                                {group.category}
                            </h3>
                            <ul className="space-y-2">
                                {group.skills.map((skill) => (
                                    <li
                                        key={skill}
                                        className="text-sm text-[var(--text-secondary)]"
                                    >
                                        {skill}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
