"use client";

import { motion } from "framer-motion";

export default function Hero() {
    return (
        <section id="home" className="pt-28 min-h-[85vh] flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="space-y-8 max-w-4xl"
            >
                {/* Tag */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-sm text-sky-400 font-mono tracking-widest uppercase"
                >
                    IIIT Pune • B.Tech CSE • 2027
                </motion.p>

                {/* Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
                    className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.05]"
                >
                    Hi, I&apos;m Aditya
                </motion.h1>

                {/* Subtext */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.55 }}
                    className="text-base md:text-lg text-slate-400 leading-[1.75] max-w-2xl mx-auto"
                >
                    Full Stack Developer focused on Machine Learning and scalable systems.
                    I build recommendation engines, data-driven platforms, and intelligent applications.
                </motion.p>

                {/* Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="flex flex-wrap justify-center gap-4 pt-4"
                >
                    <a
                        href="#projects"
                        className="bg-white text-black px-7 py-3 rounded-full font-medium hover:scale-[1.03] transition-all duration-200"
                    >
                        View My Work
                    </a>

                    <a
                        href="https://drive.google.com/file/d/1vzrKEpDGGLUcU3jRtCm9lk6MLR7-7NG-/view?usp=sharing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-[#2a2a30] px-7 py-3 rounded-full text-slate-300 hover:border-sky-500/40 hover:text-sky-300 transition-all duration-200"
                    >
                        View Resume
                    </a>
                </motion.div>

                {/* System Metadata */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                    className="flex justify-center gap-6 pt-2"
                >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Status: Available</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Focus: ML Systems</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Location: India</span>
                </motion.div>
            </motion.div>
        </section>
    );
}