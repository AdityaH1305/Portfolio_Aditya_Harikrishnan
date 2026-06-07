"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const Orb = dynamic(() => import("@/components/Orb"), {
    ssr: false,
    loading: () => null,
});

/* ══════════════════════════════════════════════════════
   Contact Section — Convergence
   
   The orb returns as the final visual centerpiece.
   Personal language replaces generic portfolio phrases.
   All links preserved: Email, GitHub, LinkedIn.
   Footer metadata preserved.
   ══════════════════════════════════════════════════════ */

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export default function Contact() {
    return (
        <section
            id="contact"
            className="relative py-32 md:py-40 border-t border-[rgba(255,255,255,0.04)]"
        >
            <div className="section-container">
                <div className="flex flex-col items-center text-center">
                    {/* ── Orb returns — final visual centerpiece ── */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{
                            duration: 1.2,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                        viewport={{ once: true }}
                        className="w-48 h-48 md:w-64 md:h-64 mb-12 hidden md:block"
                    >
                        <Orb className="w-full h-full" />
                    </motion.div>

                    {/* ── Heading — personal, distinctive ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: EASE }}
                        viewport={{ once: true }}
                    >
                        <h2 className="heading-lg">
                            Interested in building
                            <br />
                            <span className="text-[var(--accent)]">
                                something meaningful?
                            </span>
                        </h2>
                        <p className="body-lg mt-6 max-w-md mx-auto">
                            Open to internships, research collaborations,
                            <br />
                            and ambitious projects.
                        </p>
                    </motion.div>

                    {/* ── Contact Links ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.1, ease: EASE }}
                        viewport={{ once: true }}
                        className="mt-12 flex flex-col sm:flex-row gap-4"
                    >
                        {/* Email */}
                        <a
                            href="mailto:adityaharikrishnan@gmail.com"
                            className="btn-primary"
                        >
                            Email Me
                        </a>

                        {/* GitHub */}
                        <a
                            href="https://github.com/AdityaH1305"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                        >
                            GitHub
                        </a>

                        {/* LinkedIn */}
                        <a
                            href="https://www.linkedin.com/in/aditya-harikrishnan-3932192a4/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                        >
                            LinkedIn
                        </a>
                    </motion.div>
                </div>
            </div>

            {/* ── Footer ── */}
            <footer className="mt-24 pt-8 border-t border-[rgba(255,255,255,0.04)]">
                <div className="section-container">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
                            <span className="text-[10px] mono uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                                Status: Available
                            </span>
                            <span className="text-[10px] mono uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                                Focus: ML Systems
                            </span>
                            <span className="text-[10px] mono uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                                Updated: 2026
                            </span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                            <span className="text-[10px] mono uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                                Built with Next.js + TypeScript
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] text-center mt-4 pb-4">
                        © {new Date().getFullYear()} Aditya Harikrishnan
                    </p>
                </div>
            </footer>
        </section>
    );
}