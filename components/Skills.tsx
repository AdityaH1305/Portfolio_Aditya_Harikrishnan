"use client";

import Reveal from "@/components/Reveal";

/* ══════════════════════════════════════════════════════
   Stack — Editorial Layout

   Supporting information — reduced visual prominence.
   No progress bars, no percentages, no radial charts.

   id="stack" is required: SideNav and the atlas both index
   against it, and without an id this section was
   unreachable from either.
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

export default function Skills() {
    return (
        <section id="stack" className="section-y section-divide">
            <div className="section-container">
                {/* ── Header ── */}
                <Reveal y={12}>
                    <p className="label">05 / Stack</p>
                    <h2 className="heading-lg mt-3">Skills &amp; Tools</h2>
                </Reveal>

                {/* ── Skill Groups — editorial columns ── */}
                <Reveal
                    y={16}
                    delay={0.1}
                    className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-10"
                >
                    {skillGroups.map((group) => (
                        <div key={group.category}>
                            <h3 className="label mb-4">{group.category}</h3>
                            <ul className="space-y-2.5">
                                {group.skills.map((skill) => (
                                    <li
                                        key={skill}
                                        className="text-sm text-secondary"
                                    >
                                        {skill}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </Reveal>
            </div>
        </section>
    );
}
