"use client";

import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";

/* ══════════════════════════════════════════════════════
   Contact Section

   The only centered section on the page — that is what
   makes it read as the terminus.
   ══════════════════════════════════════════════════════ */

export default function Contact() {
    return (
        <section
            id="contact"
            className="relative section-y section-divide"
        >
            <div className="section-container">
                <div className="flex flex-col items-center text-center">
                    {/* ── Heading — personal, distinctive ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: EASE }}
                        viewport={{ once: true }}
                    >
                        <p className="label">07 / Contact</p>
                        <h2 className="heading-lg mt-3">
                            Interested in building
                            <br />
                            <span className="text-accent">
                                something meaningful?
                            </span>
                        </h2>
                        <p className="body-lg mt-7 max-w-md mx-auto">
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
                        className="mt-14 flex flex-col sm:flex-row gap-4"
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
            <footer className="mt-24 pt-8 border-t border-edge">
                <div className="section-container">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
                            <span className="label-muted">
                                Status: Available
                            </span>
                            <span className="label-muted">
                                Focus: ML Systems
                            </span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                            <span className="label-muted">
                                Built with Next.js + TypeScript
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-tertiary text-center mt-5 pb-6">
                        © {new Date().getFullYear()} Aditya Harikrishnan
                    </p>
                </div>
            </footer>
        </section>
    );
}