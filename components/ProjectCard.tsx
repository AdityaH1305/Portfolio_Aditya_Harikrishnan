"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ══════════════════════════════════════════════════════
   Project Presentation Components — Tiered Hierarchy

   Three distinct visual tiers:

   Tier 1: Ludex — handled by LudexShowcase (not here)
   Tier 2: PlayNexus — PlayNexusShowcase, expanded feature
           showcase with hero image + thumbnail carousel
   Tier 3: SynthRescue + Sheriff — CompactProjectCard,
           condensed evidence-strip cards side by side

   Design decisions:
   - PlayNexus gets vertical flow with large hero image
     on top, content below — breaks the left/right split
     pattern used by other sections
   - Compact cards use a tight vertical layout with
     constrained image and minimal highlights
   - Lightbox and carousel functionality preserved
   ══════════════════════════════════════════════════════ */

export interface ProjectData {
    title: string;
    tag: string;
    description: string;
    highlights: string[];
    github: string | null;
    demo: string | null;
    image?: string;
    images?: string[];
}

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

/* ═══════════════════════════════════════════════════════
   Lightbox Modal — shared between all project tiers
   ═══════════════════════════════════════════════════════ */
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

    const goPrev = useCallback(() => {
        if (!canNavigate) return;
        const prevIdx =
            (currentIndex! - 1 + images!.length) % images!.length;
        onNavigate!(prevIdx);
    }, [canNavigate, currentIndex, images, onNavigate]);

    const goNext = useCallback(() => {
        if (!canNavigate) return;
        const nextIdx = (currentIndex! + 1) % images!.length;
        onNavigate!(nextIdx);
    }, [canNavigate, currentIndex, images, onNavigate]);

    const handleKey = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
        },
        [onClose, goPrev, goNext]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [handleKey]);

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

                {/* Navigation Arrows */}
                {canNavigate && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                goPrev();
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
                                goNext();
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
   Tier 2: PlayNexus Showcase

   The strongest supporting project. Gets:
   - Full-width hero image with carousel
   - Thumbnail strip for image navigation
   - Full description and highlights
   - Prominent CTAs

   Layout: vertical flow (image on top, content below)
   This deliberately breaks from the left/right split
   that the old ProjectCard used, creating a distinct
   visual rhythm from both Ludex and the compact cards.
   ═══════════════════════════════════════════════════════ */
export function PlayNexusShowcase({
    project,
}: {
    project: ProjectData;
}) {
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [activeImage, setActiveImage] = useState(0);

    const allImages =
        project.images ?? (project.image ? [project.image] : []);

    const openLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setLightboxSrc(allImages[idx]);
    };

    const navigateLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setLightboxSrc(allImages[idx]);
    };

    const prevImage = () =>
        setActiveImage((c) => (c - 1 + allImages.length) % allImages.length);
    const nextImage = () =>
        setActiveImage((c) => (c + 1) % allImages.length);

    return (
        <div className="playnexus-showcase">
            <div className="section-container">
                {/* Tag + Title */}
                <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    viewport={{ once: true }}
                    className="label"
                >
                    {project.tag}
                </motion.p>

                <motion.h3
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
                    viewport={{ once: true }}
                    className="heading-lg mt-3"
                >
                    {project.title}
                </motion.h3>

                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
                    viewport={{ once: true }}
                    className="body-lg mt-5 max-w-2xl"
                >
                    {project.description}
                </motion.p>
            </div>

            {/* Hero Image with Carousel */}
            {allImages.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 1, delay: 0.12, ease: EASE }}
                    viewport={{ once: true }}
                    className="mt-10 md:mt-14 px-5 md:px-10 max-w-5xl mx-auto"
                >
                    {/* Main image in double-bezel */}
                    <div className="shell-bezel">
                        <div className="core-bezel overflow-hidden">
                            <div className="relative w-full aspect-[16/10] group/hero-img">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeImage}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.35, ease: EASE }}
                                        className="relative w-full h-full cursor-pointer"
                                        onClick={() => openLightbox(activeImage)}
                                    >
                                        <Image
                                            src={allImages[activeImage]}
                                            alt={`${project.title} screenshot ${activeImage + 1}`}
                                            fill
                                            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/hero-img:scale-[1.015]"
                                            sizes="(max-width: 768px) 100vw, 960px"
                                            priority={activeImage === 0}
                                        />
                                    </motion.div>
                                </AnimatePresence>

                                {/* Carousel Arrows */}
                                {allImages.length > 1 && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                prevImage();
                                            }}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                                                       bg-[#050505]/80 border border-[rgba(255,255,255,0.1)]
                                                       text-white/70 hover:text-white hover:bg-[#050505]
                                                       transition-opacity duration-200 text-sm
                                                       opacity-0 group-hover/hero-img:opacity-100"
                                            aria-label="Previous image"
                                        >
                                            ‹
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                nextImage();
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
                                                       bg-[#050505]/80 border border-[rgba(255,255,255,0.1)]
                                                       text-white/70 hover:text-white hover:bg-[#050505]
                                                       transition-opacity duration-200 text-sm
                                                       opacity-0 group-hover/hero-img:opacity-100"
                                            aria-label="Next image"
                                        >
                                            ›
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Thumbnail Strip */}
                    {allImages.length > 1 && (
                        <div className="mt-3 flex gap-2 justify-center">
                            {allImages.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveImage(i)}
                                    className={`relative w-16 h-11 md:w-20 md:h-14 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                                        i === activeImage
                                            ? "ring-1 ring-[var(--accent)] opacity-100"
                                            : "opacity-40 hover:opacity-70 ring-1 ring-transparent"
                                    }`}
                                    style={{ borderRadius: "6px" }}
                                    aria-label={`View screenshot ${i + 1}`}
                                >
                                    <Image
                                        src={img}
                                        alt={`${project.title} thumbnail ${i + 1}`}
                                        fill
                                        className="object-cover"
                                        sizes="80px"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {/* Highlights + CTAs */}
            <div className="section-container">
                <div className="mt-12 md:mt-16 grid md:grid-cols-2 gap-10 md:gap-16 items-start">
                    {/* Highlights */}
                    <motion.ul
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
                        viewport={{ once: true }}
                        className="space-y-3"
                    >
                        {project.highlights.map((item, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-3 text-sm text-[var(--text-secondary)]"
                            >
                                <span className="text-[var(--accent)] mt-0.5 text-xs shrink-0">
                                    ─
                                </span>
                                {item}
                            </li>
                        ))}
                    </motion.ul>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.14, ease: EASE }}
                        viewport={{ once: true }}
                        className="flex gap-4 flex-wrap items-start md:justify-end"
                    >
                        {project.github && (
                            <a
                                href={project.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary group/btn flex items-center pr-2"
                            >
                                <span className="pl-2">GitHub</span>
                                <div className="ml-3 w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:translate-x-1 group-hover/btn:-translate-y-[1px] group-hover/btn:scale-105">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </div>
                            </a>
                        )}
                        {project.demo && (
                            <a
                                href={project.demo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary group/btn flex items-center pr-2"
                            >
                                <span className="pl-2">Live Demo</span>
                                <div className="ml-3 w-8 h-8 rounded-full bg-black/10 dark:bg-white/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/btn:translate-x-1 group-hover/btn:-translate-y-[1px] group-hover/btn:scale-105">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
                                </div>
                            </a>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxSrc && (
                    <LightboxModal
                        src={lightboxSrc}
                        alt={project.title}
                        onClose={() => setLightboxSrc(null)}
                        images={allImages}
                        currentIndex={lightboxIndex}
                        onNavigate={navigateLightbox}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}


/* ═══════════════════════════════════════════════════════
   Tier 3: Compact Project Card

   Supporting evidence cards. Designed for side-by-side
   display in a 2-column grid. Features:
   - Constrained image (16:10 aspect) at top
   - Tight description (2-3 lines max visible)
   - Condensed highlights (top 3 only)
   - Inline link row
   - Click-to-lightbox on image

   These cards use the double-bezel system but at a
   smaller scale. No giant faded numbers, no full-page
   chapter treatment.
   ═══════════════════════════════════════════════════════ */
export function CompactProjectCard({
    project,
    index,
}: {
    project: ProjectData;
    index: number;
}) {
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const allImages =
        project.images ?? (project.image ? [project.image] : []);

    const openLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setLightboxSrc(allImages[idx]);
    };

    const navigateLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setLightboxSrc(allImages[idx]);
    };

    /* Show max 3 highlights in compact view */
    const visibleHighlights = project.highlights.slice(0, 3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1, ease: EASE }}
            viewport={{ once: true }}
            className="compact-project-card"
        >
            {/* Image */}
            {allImages.length > 0 && (
                <div className="shell-bezel compact-bezel">
                    <div className="core-bezel overflow-hidden">
                        <div
                            className="relative w-full aspect-[16/10] cursor-pointer group/compact-img"
                            onClick={() => openLightbox(0)}
                        >
                            <Image
                                src={allImages[0]}
                                alt={`${project.title} preview`}
                                fill
                                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/compact-img:scale-[1.03]"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                            {allImages.length > 1 && (
                                <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-[#050505]/80 border border-white/10 text-[10px] mono text-white/60">
                                    +{allImages.length - 1} more
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="mt-6">
                <span className="compact-tag">{project.tag}</span>
                <h4 className="heading-sm mt-2">{project.title}</h4>
                <p className="body-sm mt-3 compact-description">
                    {project.description}
                </p>

                {/* Condensed highlights */}
                <ul className="mt-5 space-y-2">
                    {visibleHighlights.map((item, i) => (
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
                    {project.github && (
                        <a
                            href={project.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="compact-link"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            GitHub
                        </a>
                    )}
                    {project.demo && (
                        <a
                            href={project.demo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="compact-link compact-link--accent"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
                            Live Demo
                        </a>
                    )}
                </div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxSrc && (
                    <LightboxModal
                        src={lightboxSrc}
                        alt={project.title}
                        onClose={() => setLightboxSrc(null)}
                        images={allImages}
                        currentIndex={lightboxIndex}
                        onNavigate={navigateLightbox}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
