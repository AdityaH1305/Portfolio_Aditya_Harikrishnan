"use client";

import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   Hero

   Carries on typography alone — the WebGL fluid that used
   to sit behind it is gone. The LivingArchitecture atlas
   occupies the right ~48% of the viewport, which is why
   this column stays capped at max-w-2xl.
   ══════════════════════════════════════════════════════ */

const facts = [
    { label: "Education", lines: ["B.Tech Computer Science", "IIIT Pune"] },
    { label: "Focus", lines: ["ML Systems", "Full-Stack", "System Design"] },
    { label: "Status", lines: ["Open to internships", "& research roles"] },
];

const RESUME_URL =
    "https://drive.google.com/file/d/1vzrKEpDGGLUcU3jRtCm9lk6MLR7-7NG-/view?usp=sharing";

export default function Hero() {
    return (
        <section
            id="intro"
            className="relative min-h-[100dvh] flex items-center overflow-hidden pt-24 pb-20 md:pt-0 md:pb-0"
        >
            <div className="section-container w-full relative z-[1]">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
                    className="max-w-2xl"
                >
                    {/* Eyebrow */}
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
                        className="label"
                    >
                        01 / Intro
                    </motion.p>

                    {/* Name */}
                    <motion.h1
                        initial={{ opacity: 0, y: 32 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, delay: 0.25, ease: EASE }}
                        className="display mt-6"
                    >
                        <span className="block">ADITYA</span>
                        <span className="block">HARIKRISHNAN</span>
                    </motion.h1>

                    {/* Tagline */}
                    <motion.p
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.5, ease: EASE }}
                        className="mt-8 text-xl md:text-2xl lg:text-3xl
                                   font-light leading-snug tracking-tight text-secondary"
                    >
                        Building systems,
                        <br />
                        <span className="text-primary">not just websites.</span>
                    </motion.p>

                    {/* Supporting statement */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.65, ease: EASE }}
                        className="mt-6 body-lg max-w-md"
                    >
                        From recommendation engines to large-scale discovery
                        platforms.
                    </motion.p>

                    {/* Fact strip */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.8, ease: EASE }}
                        className="mt-12 flex flex-wrap gap-x-12 gap-y-5"
                    >
                        {facts.map((fact) => (
                            <div key={fact.label}>
                                <p className="label-muted mb-2">{fact.label}</p>
                                {fact.lines.map((line) => (
                                    <p
                                        key={line}
                                        className="text-sm text-secondary leading-relaxed"
                                    >
                                        {line}
                                    </p>
                                ))}
                            </div>
                        ))}
                    </motion.div>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.95, ease: EASE }}
                        className="mt-14 flex flex-wrap items-center gap-4"
                    >
                        <a
                            href="#work"
                            className="btn-primary group/btn pr-2"
                        >
                            <span className="pl-2">View My Work</span>
                            <span
                                className="ml-2 w-8 h-8 rounded-full bg-black/15
                                           flex items-center justify-center
                                           transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                                           group-hover/btn:translate-x-1 group-hover/btn:-translate-y-px"
                            >
                                <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                                </svg>
                            </span>
                        </a>
                        <a
                            href={RESUME_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                        >
                            View Resume
                        </a>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
