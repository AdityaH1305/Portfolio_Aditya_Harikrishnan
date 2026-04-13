"use client";

import { motion } from "framer-motion";

export default function Hero() {
    return (
        <section id="home" className="pt-24 min-h-[80vh] flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">

            {/* Background Glow */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-6 max-w-3xl"
            >
                {/* Tag */}
                <p className="text-sm text-blue-400 font-mono tracking-widest uppercase">
                    IIIT Pune • B.Tech CSE • 2027
                </p>

                {/* Heading */}
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                    Building Intelligent Systems
                </h1>

                {/* Subtext */}
                <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
                    Full Stack Developer focused on Machine Learning and scalable systems.
                    I build recommendation engines, data-driven platforms, and intelligent applications.
                </p>

                {/* Buttons */}
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                    <a
                        href="#projects"
                        className="bg-white text-black px-6 py-3 rounded-full font-medium hover:scale-105 transition"
                    >
                        View My Work
                    </a>

                    <a
                        href="/resume.pdf"
                        className="border border-slate-500 px-6 py-3 rounded-full hover:bg-white hover:text-black transition"
                    >
                        Download CV
                    </a>
                </div>
            </motion.div>
        </section>
    );
}