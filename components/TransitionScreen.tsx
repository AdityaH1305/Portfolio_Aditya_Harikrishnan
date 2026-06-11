"use client";

import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════
   TransitionScreen — Narrative Connectors

   Compact editorial transitions that bridge major
   portfolio sections with intentional, contextual copy.

   Three layout variants create visual progression:
   - "rule":   gold gradient line above stacked content
   - "border": left accent border with indented content
   - "inline": index + heading on one line, signal-like

   Design skills applied:
   - design-taste-frontend: left-aligned editorial,
     custom cubic-bezier motion, compact footprint
   - high-end-visual-design: gold accent restraint,
     no banned transitions, GPU-safe animations
   - full-output-enforcement: complete implementation
   ══════════════════════════════════════════════════════ */

interface TransitionScreenProps {
    index: string;
    heading: string;
    body: string;
    variant?: "rule" | "border" | "inline";
}

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

export default function TransitionScreen({
    index,
    heading,
    body,
    variant = "rule",
}: TransitionScreenProps) {
    /* ── Variant: Rule ──────────────────────────────────
       Gold gradient line at top, stacked content below.
       Used as the opening transition — clean, classical.
       ─────────────────────────────────────────────────── */
    if (variant === "rule") {
        return (
            <div className="py-16 md:py-20">
                <div className="section-container">
                    <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        whileInView={{ scaleX: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: EASE }}
                        viewport={{ once: true }}
                        className="narrative-rule"
                        style={{ transformOrigin: "left" }}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
                        viewport={{ once: true }}
                        className="mt-6 md:mt-8"
                    >
                        <span className="mono text-[11px] tracking-[0.15em] text-[var(--accent)]">
                            {index}
                        </span>
                        <h3 className="heading-sm mt-3">{heading}</h3>
                        <p className="body-sm mt-2.5 max-w-md">{body}</p>
                    </motion.div>
                </div>
            </div>
        );
    }

    /* ── Variant: Border ────────────────────────────────
       Left accent border with gradient fade. Content
       indented. Creates a "pull-quote" editorial feel.
       ─────────────────────────────────────────────────── */
    if (variant === "border") {
        return (
            <div className="py-16 md:py-20">
                <div className="section-container">
                    <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: EASE }}
                        viewport={{ once: true }}
                        className="pl-5 md:pl-7 relative"
                    >
                        {/* Animated gold border-left */}
                        <motion.div
                            initial={{ scaleY: 0, opacity: 0 }}
                            whileInView={{ scaleY: 1, opacity: 1 }}
                            transition={{
                                duration: 0.6,
                                delay: 0.1,
                                ease: EASE,
                            }}
                            viewport={{ once: true }}
                            className="absolute left-0 top-0 bottom-0 w-px"
                            style={{
                                transformOrigin: "top",
                                background:
                                    "linear-gradient(to bottom, var(--accent), transparent)",
                            }}
                        />

                        <span className="mono text-[11px] tracking-[0.15em] text-[var(--accent)]">
                            {index}
                        </span>
                        <h3 className="heading-sm mt-3">{heading}</h3>
                        <p className="body-sm mt-2.5 max-w-md">{body}</p>
                    </motion.div>
                </div>
            </div>
        );
    }

    /* ── Variant: Inline ────────────────────────────────
       Index, gold dash, and heading on a single line.
       Most compact — reads like a system log entry.
       ─────────────────────────────────────────────────── */
    return (
        <div className="py-16 md:py-20">
            <div className="section-container">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    viewport={{ once: true }}
                >
                    <div className="flex items-center gap-3 md:gap-4">
                        <span className="mono text-[11px] tracking-[0.15em] text-[var(--accent)] flex-shrink-0">
                            {index}
                        </span>
                        <div className="w-5 md:w-7 h-px bg-[rgba(212,175,55,0.35)] flex-shrink-0" />
                        <h3 className="heading-sm">{heading}</h3>
                    </div>
                    <p className="body-sm mt-3 max-w-md">{body}</p>
                </motion.div>
            </div>
        </div>
    );
}
