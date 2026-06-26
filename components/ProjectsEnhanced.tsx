"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ══════════════════════════════════════════════════════
   Projects Section — Curated Asymmetric Composition

   Visual hierarchy (non-negotiable):
   Tier 1: Ludex — full immersive case study (LudexShowcase)
   Tier 2: PlayNexus — large editorial card, hero image,
           full highlights + CTAs. ~7/12 width on desktop.
   Tier 3: SynthRescue — polished compact card. ~5/12 width.
           Intentional, not an afterthought.

   Design rationale:
   - Asymmetric 2-column layout (7:5 ratio) creates visual
     tension and clear internal hierarchy
   - Both projects occupy one unified section, no dividers
   - PlayNexus gets hero image + editorial treatment but
     is contained — does not replicate Ludex's weight
   - SynthRescue has its own double-bezel image + content,
     polished enough to feel curated, compact enough to
     read as tertiary
   - No eyebrow label (Ludex already uses the budget)
   - Section heading kept minimal to avoid competing
     with Ludex's heading-xl

   Skills applied:
   - design-taste-frontend: asymmetric layout, no
     repetitive card grid, editorial composition
   - high-end-visual-design: double-bezel containers,
     custom cubic-bezier motion, macro whitespace
   - full-output-enforcement: complete implementation
   ══════════════════════════════════════════════════════ */

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

/* ── Lightbox Modal ── */
function LightboxModal({
    src,
    alt,
    onClose,
    images,
    currentIndex,
    onNavigate,
}: {
    src: string;
    alt: string;
    onClose: () => void;
    images?: string[];
    currentIndex?: number;
    onNavigate?: (idx: number) => void;
}) {
    const canNavigate = images && images.length > 1 && onNavigate;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-pointer"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="relative max-w-[90vw] max-h-[85vh] w-auto h-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={src}
                    alt={alt}
                    className="max-w-full max-h-[85vh] object-contain bg-black"
                />

                {canNavigate && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const prevIdx =
                                    (currentIndex! - 1 + images!.length) %
                                    images!.length;
                                onNavigate!(prevIdx);
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10
                                       flex items-center justify-center
                                       bg-black/80 border border-white/10
                                       text-white/70 hover:text-white hover:bg-black
                                       transition-all duration-200 text-xl shadow-md"
                            aria-label="Previous image"
                        >
                            ‹
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const nextIdx =
                                    (currentIndex! + 1) % images!.length;
                                onNavigate!(nextIdx);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10
                                       flex items-center justify-center
                                       bg-black/80 border border-white/10
                                       text-white/70 hover:text-white hover:bg-black
                                       transition-all duration-200 text-xl shadow-md"
                            aria-label="Next image"
                        >
                            ›
                        </button>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════════
   PlayNexus — Tier 2 Editorial Card

   Large hero image in double-bezel, editorial content
   below. Substantial but contained. No thumbnail strip
   or carousel arrows — the single hero image reads
   cleaner and avoids competing with Ludex's video tabs.
   ═══════════════════════════════════════════════════════ */
function PlayNexusCard() {
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [activeImage, setActiveImage] = useState(0);

    const images = [
        "/projects/playnexus2.png",
        "/projects/playnexus-new.png",
        "/projects/playnexus3.png",
        "/projects/playnexus4.png",
        "/projects/playnexus5.png",
    ];

    const highlights = [
        "Real-time Steam API integration",
        "Multi-region price comparison",
        "Custom value score algorithm",
        "Vibe-based game discovery system",
    ];

    const openLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setLightboxSrc(images[idx]);
    };

    const navigateLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setLightboxSrc(images[idx]);
    };

    return (
        <div>
            {/* Hero image — double-bezel, click-to-lightbox */}
            <motion.div
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
                viewport={{ once: true }}
            >
                <div className="shell-bezel">
                    <div className="core-bezel overflow-hidden">
                        <div className="relative w-full aspect-[16/10] group/pn-img">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeImage}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{
                                        duration: 0.35,
                                        ease: EASE,
                                    }}
                                    className="relative w-full h-full cursor-pointer"
                                    onClick={() => openLightbox(activeImage)}
                                >
                                    <Image
                                        src={images[activeImage]}
                                        alt={`PlayNexus screenshot ${activeImage + 1}`}
                                        fill
                                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/pn-img:scale-[1.015]"
                                        sizes="(max-width: 768px) 100vw, 60vw"
                                        priority
                                    />
                                </motion.div>
                            </AnimatePresence>

                            {/* Image count indicator */}
                            {images.length > 1 && (
                                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-[#050505]/80 border border-white/10 text-[10px] mono text-white/60">
                                    +{images.length - 1} more
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Thumbnail strip */}
                {images.length > 1 && (
                    <div className="mt-2.5 flex gap-1.5">
                        {images.map((img, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveImage(i)}
                                className={`relative flex-1 h-9 md:h-11 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                                    i === activeImage
                                        ? "ring-1 ring-[var(--accent)] opacity-100"
                                        : "opacity-35 hover:opacity-60 ring-1 ring-transparent"
                                }`}
                                style={{ borderRadius: "4px" }}
                                aria-label={`View screenshot ${i + 1}`}
                            >
                                <Image
                                    src={img}
                                    alt={`PlayNexus thumbnail ${i + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="120px"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.14, ease: EASE }}
                viewport={{ once: true }}
                className="mt-8"
            >
                <span className="label">Full Stack / Data Platform</span>
                <h3 className="heading-md mt-2.5">PlayNexus</h3>
                <p className="body-sm mt-4 max-w-lg">
                    Full-stack data platform with a multi-region price
                    aggregation pipeline, custom value-scoring algorithm, and
                    vibe-based discovery. Engineered for data-driven decision
                    making at scale.
                </p>

                {/* Highlights */}
                <ul className="mt-6 space-y-2.5">
                    {highlights.map((item, i) => (
                        <li
                            key={i}
                            className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)] leading-snug"
                        >
                            <span className="text-[var(--accent)] mt-0.5 text-[10px] shrink-0">
                                ─
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>

                {/* CTAs */}
                <div className="mt-8 flex gap-3 flex-wrap">
                    <a
                        href="https://github.com/AdityaH1305/PlayNexus"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary group/btn flex items-center pr-2"
                    >
                        <span className="pl-2">GitHub</span>
                        <div className="ml-3 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:translate-x-1 group-hover/btn:-translate-y-[1px] group-hover/btn:scale-105">
                            <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </div>
                    </a>
                    <a
                        href="https://playnexus-io.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary group/btn flex items-center pr-2"
                    >
                        <span className="pl-2">Live Demo</span>
                        <div className="ml-3 w-7 h-7 rounded-full bg-black/10 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:translate-x-1 group-hover/btn:-translate-y-[1px] group-hover/btn:scale-105">
                            <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path d="M7 17L17 7M17 7H7M17 7v10" />
                            </svg>
                        </div>
                    </a>
                </div>
            </motion.div>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxSrc && (
                    <LightboxModal
                        src={lightboxSrc}
                        alt="PlayNexus"
                        onClose={() => setLightboxSrc(null)}
                        images={images}
                        currentIndex={lightboxIndex}
                        onNavigate={navigateLightbox}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SynthRescue — Tier 3 Polished Compact Card

   Double-bezel image + tight editorial content.
   Intentional and polished, not an afterthought.
   Occupies the narrower column on desktop.
   ═══════════════════════════════════════════════════════ */
function SynthRescueCard() {
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const images = ["/projects/synth1.png", "/projects/synth2.png"];

    const highlights = [
        "Real-time image upload and analysis pipeline",
        "YOLO-based structural damage detection",
        "AI-generated emergency response reports using Gemini",
    ];

    const openLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setLightboxSrc(images[idx]);
    };

    const navigateLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setLightboxSrc(images[idx]);
    };

    return (
        <div>
            {/* Image — double-bezel, click-to-lightbox */}
            <motion.div
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.16, ease: EASE }}
                viewport={{ once: true }}
            >
                <div className="shell-bezel compact-bezel">
                    <div className="core-bezel overflow-hidden">
                        <div
                            className="relative w-full aspect-[16/10] cursor-pointer group/sr-img"
                            onClick={() => openLightbox(0)}
                        >
                            <Image
                                src={images[0]}
                                alt="SynthRescue preview"
                                fill
                                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/sr-img:scale-[1.03]"
                                sizes="(max-width: 768px) 100vw, 40vw"
                            />
                            {images.length > 1 && (
                                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-[#050505]/80 border border-white/10 text-[10px] mono text-white/60">
                                    +{images.length - 1} more
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
                viewport={{ once: true }}
                className="mt-6"
            >
                <span className="compact-tag">AI / Computer Vision</span>
                <h4 className="heading-sm mt-2">SynthRescue</h4>
                <p className="body-sm mt-3 compact-description">
                    Real-time structural damage assessment pipeline combining
                    YOLO-based detection with AI-assisted triage for rapid
                    deployment in disaster response.
                </p>

                {/* Highlights */}
                <ul className="mt-5 space-y-2">
                    {highlights.map((item, i) => (
                        <li
                            key={i}
                            className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)] leading-snug"
                        >
                            <span className="text-[var(--accent)] mt-0.5 text-[10px] shrink-0">
                                ─
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>

                {/* Link row */}
                <div className="mt-6 flex gap-3 items-center">
                    <a
                        href="https://github.com/AdityaH1305/SynthRescue"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="compact-link"
                    >
                        <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                        >
                            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        GitHub
                    </a>
                    <a
                        href="https://synthrescue.vercel.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="compact-link compact-link--accent"
                    >
                        <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                        >
                            <path d="M7 17L17 7M17 7H7M17 7v10" />
                        </svg>
                        Live Demo
                    </a>
                </div>
            </motion.div>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxSrc && (
                    <LightboxModal
                        src={lightboxSrc}
                        alt="SynthRescue"
                        onClose={() => setLightboxSrc(null)}
                        images={images}
                        currentIndex={lightboxIndex}
                        onNavigate={navigateLightbox}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   Main Section — Asymmetric 2-Column Composition
   ══════════════════════════════════════════════════════ */
export default function ProjectsEnhanced() {
    return (
        <section id="projects" className="py-24 md:py-32">
            {/* Section heading — minimal, editorial */}
            <div className="section-container">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    viewport={{ once: true }}
                >
                    <h2 className="heading-lg">Projects</h2>
                    <p className="body-sm mt-3 max-w-lg text-[var(--text-tertiary)]">
                        Data platforms, AI systems, and full-stack engineering.
                    </p>
                </motion.div>
            </div>

            {/* Asymmetric grid: PlayNexus (7/12) | SynthRescue (5/12) */}
            <div className="section-container">
                <div className="mt-16 md:mt-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-10 items-start">
                    {/* PlayNexus — dominant column */}
                    <div className="lg:col-span-7">
                        <PlayNexusCard />
                    </div>

                    {/* SynthRescue — supporting column */}
                    <div className="lg:col-span-5">
                        <SynthRescueCard />
                    </div>
                </div>
            </div>
        </section>
    );
}
