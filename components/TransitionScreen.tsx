"use client";

import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════
   TransitionScreen
   
   Minimalist full-screen transition between major sections.
   Large editorial typography at very low opacity.
   Elegant, restrained — helps pacing.
   ══════════════════════════════════════════════════════ */

interface TransitionScreenProps {
    lines: string[];
}

export default function TransitionScreen({ lines }: TransitionScreenProps) {
    return (
        <div className="transition-screen" aria-hidden="true">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
                viewport={{ once: true, amount: 0.5 }}
            >
                {lines.map((line, i) => (
                    <motion.p
                        key={i}
                        className="transition-text"
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 0.08, y: 0 }}
                        transition={{
                            duration: 0.8,
                            delay: i * 0.15,
                            ease: [0.25, 0.1, 0.25, 1],
                        }}
                        viewport={{ once: true }}
                    >
                        {line}
                    </motion.p>
                ))}
            </motion.div>
        </div>
    );
}
