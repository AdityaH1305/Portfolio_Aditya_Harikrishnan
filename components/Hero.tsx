"use client";

import { motion } from "framer-motion";

/* ── System activation easing — snappy, engineered feel ── */
const EASE_INIT: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function Hero() {
    return (
        <section id="home" className="pt-28 min-h-[85vh] flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="space-y-6 max-w-4xl"
            >
                {/* Tag — first signal */}
                <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.25, ease: EASE_INIT }}
                    className="text-sm text-sky-400 font-mono tracking-widest uppercase font-medium"
                >
                    IIIT Pune • B.Tech CSE • 2027
                </motion.p>

                {/* Heading — primary reveal */}
                <motion.h1
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4, ease: EASE_INIT }}
                    className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.05] text-zinc-100"
                >
                    Hi, I&apos;m Aditya
                </motion.h1>

                {/* Subtext */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6, ease: EASE_INIT }}
                    className="text-base md:text-lg text-zinc-400 leading-[1.75] max-w-2xl mx-auto"
                >
                    Full Stack Developer focused on Machine Learning and scalable systems.
                    I build recommendation engines, data-driven platforms, and intelligent applications.
                </motion.p>

                {/* Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.75, ease: EASE_INIT }}
                    className="flex flex-wrap justify-center gap-4 pt-4"
                >
                    <a
                        href="#projects"
                        className="bg-white text-black px-7 py-3 rounded-full font-medium hover:scale-[1.03] shadow-[0_0_20px_rgba(56,189,248,0.2)] transition-all duration-200"
                    >
                        View My Work
                    </a>

                    <a
                        href="https://drive.google.com/file/d/1vzrKEpDGGLUcU3jRtCm9lk6MLR7-7NG-/view?usp=sharing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-zinc-700 px-7 py-3 rounded-full text-zinc-300 hover:border-sky-400 hover:text-sky-300 hover:bg-sky-950/30 transition-all duration-200"
                    >
                        View Resume
                    </a>
                </motion.div>

                {/* System Metadata — last to appear */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.95, ease: EASE_INIT }}
                    className="flex justify-center gap-6 pt-2"
                >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Status: Available</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Focus: ML Systems</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Location: India</span>
                </motion.div>
            </motion.div>
        </section>
    );
}