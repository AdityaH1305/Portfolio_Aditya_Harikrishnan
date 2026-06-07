"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ══════════════════════════════════════════════════════
   ProjectCard — Immersive Full-Width Chapter Layout
   
   Replaces the old glass-card design with a chapter-style
   full-width section. Each project feels like a chapter,
   not a card or grid item.
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

/* ── Image Carousel (preserved from original) ── */
function ImageCarousel({
    images,
    alt,
    onImageClick,
}: {
    images: string[];
    alt: string;
    onImageClick: (idx: number) => void;
}) {
    const [current, setCurrent] = useState(0);

    const prev = () =>
        setCurrent((c) => (c - 1 + images.length) % images.length);
    const next = () => setCurrent((c) => (c + 1) % images.length);

    return (
        <div className="relative w-full h-full group/carousel">
            <AnimatePresence mode="wait">
                <motion.div
                    key={current}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full h-full cursor-pointer"
                    onClick={() => onImageClick(current)}
                >
                    <Image
                        src={images[current]}
                        alt={`${alt} ${current + 1}`}
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover/carousel:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, 50vw"
                    />
                </motion.div>
            </AnimatePresence>

            {/* Arrows */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            prev();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                                   bg-[#050505]/80 border border-[rgba(255,255,255,0.1)]
                                   text-white/70 hover:text-white hover:bg-[#050505]
                                   transition-opacity duration-200 text-sm
                                   opacity-0 group-hover/carousel:opacity-100"
                        aria-label="Previous image"
                    >
                        ‹
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            next();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                                   bg-[#050505]/80 border border-[rgba(255,255,255,0.1)]
                                   text-white/70 hover:text-white hover:bg-[#050505]
                                   transition-opacity duration-200 text-sm
                                   opacity-0 group-hover/carousel:opacity-100"
                        aria-label="Next image"
                    >
                        ›
                    </button>
                </>
            )}

            {/* Dots */}
            {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrent(i);
                            }}
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                                i === current
                                    ? "bg-[var(--accent)]"
                                    : "bg-white/30"
                            }`}
                            aria-label={`Go to image ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Lightbox Modal (preserved from original) ── */
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

/* ══════════════════════════════════════════════════════
   ProjectCard — Chapter-Style Immersive Layout
   ══════════════════════════════════════════════════════ */
export default function ProjectCard({
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

    const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

    return (
        <div className="project-chapter">
            {/* Giant faded number */}
            <span className="project-number">
                {String(index + 1).padStart(2, "0")}
            </span>

            <div className="section-container">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
                    {/* ── Content ── */}
                    <div>
                        {/* Tag */}
                        <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: EASE }}
                            viewport={{ once: true }}
                            className="label"
                        >
                            {project.tag}
                        </motion.p>

                        {/* Title */}
                        <motion.h3
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
                            viewport={{ once: true }}
                            className="heading-md mt-3"
                        >
                            {project.title}
                        </motion.h3>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
                            viewport={{ once: true }}
                            className="body-lg mt-6 max-w-lg"
                        >
                            {project.description}
                        </motion.p>

                        {/* Highlights */}
                        <motion.ul
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
                            viewport={{ once: true }}
                            className="mt-8 space-y-2.5"
                        >
                            {project.highlights.map((item, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-3 text-sm text-[var(--text-secondary)]"
                                >
                                    <span className="text-[var(--accent)] mt-0.5 text-xs">
                                        ─
                                    </span>
                                    {item}
                                </li>
                            ))}
                        </motion.ul>

                        {/* Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
                            viewport={{ once: true }}
                            className="mt-8 flex gap-4 flex-wrap items-center group"
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

                    {/* ── Images ── */}
                    {allImages.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
                            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ duration: 1.2, delay: 0.1, ease: EASE }}
                            viewport={{ once: true }}
                            className="relative w-full shell-bezel backdrop-blur-2xl"
                        >
                            <div className="relative w-full aspect-[4/3] core-bezel overflow-hidden">
                                {allImages.length > 1 ? (
                                    <ImageCarousel
                                        images={allImages}
                                        alt={project.title}
                                        onImageClick={openLightbox}
                                    />
                                ) : (
                                    <div
                                        className="relative w-full h-full cursor-pointer"
                                        onClick={() => openLightbox(0)}
                                    >
                                        <Image
                                            src={allImages[0]}
                                            alt={`${project.title} preview`}
                                            fill
                                            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.03]"
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Lightbox Modal (preserved) */}
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
