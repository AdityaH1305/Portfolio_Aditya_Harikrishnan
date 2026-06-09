"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

/**
 * DEBUG PAGE — Sub-element isolation within the orb container hierarchy.
 *
 * Visit /debug-orb to toggle individual elements within the container.
 * We already know the artifact comes from orbContainer.
 * This page isolates WHICH sub-element within the container causes it.
 *
 * DELETE THIS FILE after debugging is complete.
 */

const Orb = dynamic(() => import("@/components/Orb"), {
    ssr: false,
    loading: () => null,
});

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function DebugOrbPage() {
    const [tests, setTests] = useState({
        // Test A: Full reproduction (should show artifact)
        fullRepro: true,
        // Test B: Container only, no Orb component (tests if container div alone causes it)
        containerOnly: false,
        // Test C: Orb without motion.div wrapper (tests if motion.div causes it)
        orbNoMotion: false,
        // Test D: motion.div without scale animation (tests if transform: scale causes it)
        motionNoScale: false,
        // Test E: Plain canvas (no WebGL) in same container (tests if WebGL specifically causes it)
        plainCanvas: false,
        // Test F: motion.div with scale but empty (tests if transform alone causes it)
        motionScaleEmpty: false,
    });

    const activateTest = useCallback((key: keyof typeof tests) => {
        setTests({
            fullRepro: false,
            containerOnly: false,
            orbNoMotion: false,
            motionNoScale: false,
            plainCanvas: false,
            motionScaleEmpty: false,
            [key]: true,
        });
    }, []);

    const activeTest = (Object.keys(tests) as (keyof typeof tests)[]).find(k => tests[k]) || "fullRepro";

    return (
        <div className="bg-[#050505] text-[var(--foreground)] min-h-screen relative overflow-hidden">
            {/* ── CONTROL PANEL ── */}
            <div
                style={{
                    position: "fixed",
                    top: 16,
                    left: 16,
                    zIndex: 9999,
                    background: "rgba(0,0,0,0.95)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 8,
                    padding: 16,
                    fontSize: 12,
                    fontFamily: "monospace",
                    maxWidth: 340,
                }}
            >
                <div style={{ marginBottom: 8, fontWeight: 700, color: "#D4AF37" }}>
                    Orb Container — Sub-Element Isolation
                </div>
                <div style={{ marginBottom: 8, fontSize: 10, color: "#888" }}>
                    Select ONE test at a time. Check if the boundary artifact appears.
                </div>
                <hr style={{ borderColor: "rgba(255,255,255,0.1)", margin: "6px 0" }} />

                {([
                    ["fullRepro", "A: Full reproduction (motion.div + scale + Orb)"],
                    ["containerOnly", "B: Empty container div only (no Orb, no motion)"],
                    ["orbNoMotion", "C: Orb without motion.div (plain div wrapper)"],
                    ["motionNoScale", "D: motion.div + Orb, NO scale animation"],
                    ["plainCanvas", "E: Plain 2D canvas in motion.div (no WebGL)"],
                    ["motionScaleEmpty", "F: motion.div + scale, but EMPTY (no Orb)"],
                ] as [keyof typeof tests, string][]).map(([key, label]) => (
                    <label
                        key={key}
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                            padding: "4px 0",
                            cursor: "pointer",
                            color: tests[key] ? "#4ade80" : "#999",
                        }}
                    >
                        <input
                            type="radio"
                            name="test"
                            checked={tests[key]}
                            onChange={() => activateTest(key)}
                            style={{ accentColor: "#D4AF37", marginTop: 2 }}
                        />
                        <span style={{ fontSize: 11 }}>{label}</span>
                    </label>
                ))}

                <hr style={{ borderColor: "rgba(255,255,255,0.1)", margin: "8px 0" }} />
                <div style={{ fontSize: 10, color: "#D4AF37" }}>
                    Active: {activeTest}
                </div>
                <div style={{ fontSize: 9, color: "#666", marginTop: 4 }}>
                    If artifact appears → this element is the cause.<br/>
                    If artifact disappears → this element is innocent.
                </div>
            </div>

            {/* ── HERO LAYOUT REPRODUCTION ── */}
            <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
                <div className="section-container w-full">
                    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-0">
                        {/* Left: Typography (always present for layout reference) */}
                        <div className="flex-1 max-w-2xl pt-4 lg:pt-16">
                            <h1 className="heading-xl">
                                <span className="block">ADITYA</span>
                                <span className="block">HARIKRISHNAN</span>
                            </h1>
                            <p className="text-xl md:text-2xl lg:text-3xl font-light leading-snug text-[var(--text-secondary)] tracking-tight mt-8 lg:mt-10">
                                Building systems,<br />
                                <span className="text-[var(--foreground)]">not just websites.</span>
                            </p>
                        </div>

                        {/* Right: TEST AREA — different containers based on active test */}

                        {/* TEST A: Full reproduction — exact copy of Hero.tsx */}
                        {tests.fullRepro && (
                            <motion.div
                                id="hero-orb"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1.2, delay: 0.4, ease: EASE }}
                                className="flex-shrink-0 w-full lg:w-[45%] h-[350px] md:h-[500px] lg:h-[600px] relative mt-12 md:mt-24 lg:mt-[260px] xl:mt-[300px]"
                            >
                                <Orb className="w-full h-full" />
                            </motion.div>
                        )}

                        {/* TEST B: Container only — plain div, same classes, no content */}
                        {tests.containerOnly && (
                            <div
                                className="flex-shrink-0 w-full lg:w-[45%] h-[350px] md:h-[500px] lg:h-[600px] relative mt-12 md:mt-24 lg:mt-[260px] xl:mt-[300px]"
                                style={{ border: "1px dashed rgba(255,255,255,0.05)" }}
                            >
                                <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: "#444", fontFamily: "monospace" }}>
                                    [Empty container — no Orb, no motion.div]
                                </span>
                            </div>
                        )}

                        {/* TEST C: Orb without motion.div — plain div, same classes */}
                        {tests.orbNoMotion && (
                            <div
                                id="hero-orb"
                                className="flex-shrink-0 w-full lg:w-[45%] h-[350px] md:h-[500px] lg:h-[600px] relative mt-12 md:mt-24 lg:mt-[260px] xl:mt-[300px]"
                            >
                                <Orb className="w-full h-full" />
                            </div>
                        )}

                        {/* TEST D: motion.div but NO scale — only opacity animation */}
                        {tests.motionNoScale && (
                            <motion.div
                                id="hero-orb"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1.2, delay: 0.4, ease: EASE }}
                                className="flex-shrink-0 w-full lg:w-[45%] h-[350px] md:h-[500px] lg:h-[600px] relative mt-12 md:mt-24 lg:mt-[260px] xl:mt-[300px]"
                            >
                                <Orb className="w-full h-full" />
                            </motion.div>
                        )}

                        {/* TEST E: motion.div + scale + plain 2D canvas (no WebGL) */}
                        {tests.plainCanvas && (
                            <motion.div
                                id="hero-orb"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1.2, delay: 0.4, ease: EASE }}
                                className="flex-shrink-0 w-full lg:w-[45%] h-[350px] md:h-[500px] lg:h-[600px] relative mt-12 md:mt-24 lg:mt-[260px] xl:mt-[300px]"
                            >
                                <canvas
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        display: "block",
                                        background: "transparent",
                                    }}
                                />
                                <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: "#444", fontFamily: "monospace" }}>
                                    [Plain 2D canvas — no WebGL]
                                </span>
                            </motion.div>
                        )}

                        {/* TEST F: motion.div + scale animation + empty (no canvas at all) */}
                        {tests.motionScaleEmpty && (
                            <motion.div
                                id="hero-orb"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1.2, delay: 0.4, ease: EASE }}
                                className="flex-shrink-0 w-full lg:w-[45%] h-[350px] md:h-[500px] lg:h-[600px] relative mt-12 md:mt-24 lg:mt-[260px] xl:mt-[300px]"
                            >
                                <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: "#444", fontFamily: "monospace" }}>
                                    [motion.div with scale animation — EMPTY]
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── RESULT KEY ── */}
            <div
                style={{
                    position: "fixed",
                    bottom: 16,
                    left: 16,
                    zIndex: 9999,
                    background: "rgba(0,0,0,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 4,
                    padding: "8px 12px",
                    fontSize: 10,
                    fontFamily: "monospace",
                    color: "#888",
                    lineHeight: 1.6,
                }}
            >
                <strong style={{ color: "#D4AF37" }}>Result interpretation:</strong><br />
                A shows artifact → confirms baseline<br />
                B shows artifact → container div alone is cause<br />
                B clear, C shows artifact → WebGL canvas is cause<br />
                C clear, A shows artifact → motion.div transform is cause<br />
                D clear → scale animation is cause<br />
                E shows artifact → 2D canvas compositing is cause<br />
                F shows artifact → motion.div transform alone is cause (no canvas needed)
            </div>
        </div>
    );
}
