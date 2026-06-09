"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

/* ── Lazy-load the heavy 3D orb ── */
const Orb = dynamic(() => import("@/components/Orb"), {
    ssr: false,
    loading: () => null,
});

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export default function Hero() {
    return (
        <section
            id="intro"
            className="relative min-h-[100dvh] flex items-center overflow-hidden pt-16 md:pt-0"
        >
            <div className="section-container w-full">
                <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-0">
                    {/* ── Left: Typography ── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
                        className="flex-1 max-w-2xl pt-4 lg:pt-16"
                    >
                        {/* Name — very large editorial */}
                        <motion.div
                            initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
                        >
                            <h1 className="heading-xl">
                                <span className="block">ADITYA</span>
                                <span className="block">HARIKRISHNAN</span>
                            </h1>
                        </motion.div>

                        {/* Tagline */}
                        <motion.div
                            initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ duration: 1.0, delay: 0.5, ease: EASE }}
                            className="mt-8 lg:mt-10"
                        >
                            <p className="text-xl md:text-2xl lg:text-3xl font-light leading-snug text-[var(--text-secondary)] tracking-tight">
                                Building systems,
                                <br />
                                <span className="text-[var(--foreground)]">
                                    not just websites.
                                </span>
                            </p>
                        </motion.div>

                        {/* Supporting statement */}
                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.0, delay: 0.7, ease: EASE }}
                            className="mt-5 body-lg max-w-md"
                        >
                            From recommendation engines
                            <br />
                            to large-scale discovery platforms.
                        </motion.p>

                        {/* Info blocks */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.0, delay: 0.9, ease: EASE }}
                            className="mt-10 flex flex-wrap gap-x-10 gap-y-4"
                        >
                            <div>
                                <p className="label mb-1">Education</p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    B.Tech Computer Science
                                    <br />
                                    IIIT Pune
                                </p>
                            </div>
                            <div>
                                <p className="label mb-1">Focus</p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Full-Stack Development
                                    <br />
                                    Machine Learning
                                    <br />
                                    System Design
                                </p>
                            </div>
                        </motion.div>

                        {/* CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1.0, delay: 1.1, ease: EASE }}
                            className="mt-12 flex flex-wrap items-center gap-4 group"
                        >
                            <a href="#work" className="btn-primary group/btn flex items-center pr-2">
                                <span className="pl-2">View My Work</span>
                                <div className="ml-3 w-8 h-8 rounded-full bg-black/10 dark:bg-white/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:translate-x-1 group-hover/btn:-translate-y-[1px] group-hover/btn:scale-105">
                                    <svg
                                        className="w-3.5 h-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M7 17L17 7M17 7H7M17 7v10" />
                                    </svg>
                                </div>
                            </a>
                            <a
                                href="https://drive.google.com/file/d/1vzrKEpDGGLUcU3jRtCm9lk6MLR7-7NG-/view?usp=sharing"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                            >
                                View Resume
                            </a>
                        </motion.div>
                    </motion.div>

                    {/* ── Right: The Orb (Signal Core) ── */}
                    <motion.div
                        id="hero-orb"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="flex-shrink-0 w-full lg:w-[45%] h-[350px] md:h-[500px] lg:h-[600px] relative mt-12 md:mt-24 lg:mt-[260px] xl:mt-[300px]"
                    >
                        <Orb className="w-full h-full" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}