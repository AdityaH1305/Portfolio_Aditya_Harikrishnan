"use client";

import Reveal from "@/components/Reveal";
import MagneticLink from "@/components/MagneticLink";

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
                    <Reveal y={20} duration={0.6}>
                        <p className="label">08 / Contact</p>
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
                    </Reveal>

                    {/* ── Contact Links ── */}
                    <Reveal
                        y={12}
                        duration={0.45}
                        delay={0.1}
                        className="mt-14 flex flex-col sm:flex-row gap-4"
                    >
                        <MagneticLink
                            href="mailto:adityaharikrishnan@gmail.com"
                            className="btn-primary"
                        >
                            Email Me
                        </MagneticLink>

                        <MagneticLink
                            href="https://github.com/AdityaH1305"
                            external
                            className="btn-secondary"
                        >
                            GitHub
                        </MagneticLink>

                        <MagneticLink
                            href="https://www.linkedin.com/in/aditya-harikrishnan-3932192a4/"
                            external
                            className="btn-secondary"
                        >
                            LinkedIn
                        </MagneticLink>
                    </Reveal>
                </div>
            </div>

            {/* ── Footer ──
                Left-aligned and width-capped rather than a full-width
                justify-between row. The LivingArchitecture atlas draws in the
                right 48% of the viewport (from x = 0.52·vw), and the old
                layout pushed "Built with Next.js…" to the container's right
                edge — x 876–1129 on a 1280px screen, right through the
                branches. max-w-sm keeps the whole block clear of that
                boundary from 1024px upward, and on mobile the atlas stops at
                90% viewport height so the footer sits below it either way. */}
            <footer className="mt-24 pt-8 border-t border-edge">
                <div className="section-container">
                    <div className="max-w-sm pb-10 flex flex-col gap-2.5">
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <span className="label-muted">
                                Status: Available
                            </span>
                            <span className="label-muted">
                                Focus: ML Systems
                            </span>
                        </div>
                        <span className="label-muted">
                            Built with Next.js + TypeScript
                        </span>
                        <p className="text-xs text-tertiary mt-1">
                            © {new Date().getFullYear()} Aditya Harikrishnan
                        </p>
                    </div>
                </div>
            </footer>
        </section>
    );
}