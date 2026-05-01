"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

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

/* ── Image Carousel (only for projects with images[]) ───────── */
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

    const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
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
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 240px"
                    />
                </motion.div>
            </AnimatePresence>

            {/* Arrows */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); prev(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 text-sm"
                        aria-label="Previous image"
                    >
                        ‹
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); next(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 text-sm"
                        aria-label="Next image"
                    >
                        ›
                    </button>
                </>
            )}

            {/* Dots */}
            {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                                i === current ? "bg-white" : "bg-white/40"
                            }`}
                            aria-label={`Go to image ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Lightbox Modal ─────────────────────────────────────────── */
function LightboxModal({
    src,
    alt,
    onClose,
}: {
    src: string;
    alt: string;
    onClose: () => void;
}) {
    const handleKey = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        },
        [onClose]
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="relative max-w-[90vw] max-h-[85vh] w-auto h-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={src}
                    alt={alt}
                    className="max-w-full max-h-[85vh] rounded-lg object-contain"
                />
            </motion.div>
        </motion.div>
    );
}

/* ── ProjectCard ────────────────────────────────────────────── */
export default function ProjectCard({
    project,
}: {
    project: ProjectData;
}) {
    const [hovered, setHovered] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0 },
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="group relative rounded-2xl border border-slate-800 hover:border-white/30 transition duration-300 overflow-hidden"
        >
            <div className="flex flex-col md:flex-row">
                {/* Content */}
                <div className="p-8 flex-1">
                    {/* Title */}
                    <div className="flex flex-col md:flex-row md:justify-between gap-2">
                        <h3 className="text-2xl font-semibold">
                            {project.title}
                        </h3>
                        <span className="text-sm text-blue-400 font-mono">
                            {project.tag}
                        </span>
                    </div>

                    {/* Description */}
                    <p className="text-slate-400 mt-4 max-w-3xl">
                        {project.description}
                    </p>

                    {/* Highlights */}
                    <ul className="mt-6 grid md:grid-cols-2 gap-2 text-sm text-slate-300">
                        {project.highlights.map((item, i) => (
                            <li key={i}>• {item}</li>
                        ))}
                    </ul>

                    {/* Buttons */}
                    <div className="mt-6 flex gap-4 flex-wrap">
                        {project.github && (
                            <a
                                href={project.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-5 py-2 rounded-full border border-slate-600 text-sm hover:bg-white hover:text-black transition"
                            >
                                GitHub
                            </a>
                        )}
                        {project.demo && (
                            <a
                                href={project.demo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-5 py-2 rounded-full bg-white text-black text-sm hover:scale-105 transition"
                            >
                                Live Demo
                            </a>
                        )}
                    </div>
                </div>

                {/* Image Preview — single image (slides in on hover) */}
                {project.image && !project.images && (
                    <div
                        className={`
                            hidden md:flex items-center justify-center
                            w-0 group-hover:w-72 overflow-hidden
                            transition-all duration-500 ease-out
                            bg-slate-900/50 border-l border-slate-800/50
                        `}
                    >
                        <div className={`
                            relative w-60 h-40 rounded-lg overflow-hidden cursor-pointer
                            transition-all duration-500 delay-100
                            ${hovered ? "opacity-100 scale-100" : "opacity-0 scale-95"}
                        `}
                        onClick={() => setLightboxSrc(project.image!)}>
                            <Image
                                src={project.image}
                                alt={`${project.title} preview`}
                                fill
                                className="object-cover rounded-lg"
                                sizes="240px"
                            />
                        </div>
                    </div>
                )}

                {/* Mobile image — single image */}
                {project.image && !project.images && (
                    <div 
                        className="md:hidden relative w-full h-48 border-t border-slate-800/50 cursor-pointer"
                        onClick={() => setLightboxSrc(project.image!)}
                    >
                        <Image
                            src={project.image}
                            alt={`${project.title} preview`}
                            fill
                            className="object-cover"
                            sizes="100vw"
                        />
                    </div>
                )}

                {/* Image Carousel — multi-image (desktop, slides in on hover) */}
                {project.images && project.images.length > 0 && (
                    <div
                        className={`
                            hidden md:flex items-center justify-center
                            w-0 group-hover:w-72 overflow-hidden
                            transition-all duration-500 ease-out
                            bg-slate-900/50 border-l border-slate-800/50
                        `}
                    >
                        <div className={`
                            relative w-60 h-40 rounded-lg overflow-hidden
                            transition-all duration-500 delay-100
                            ${hovered ? "opacity-100 scale-100" : "opacity-0 scale-95"}
                        `}>
                            <ImageCarousel
                                images={project.images}
                                alt={project.title}
                                onImageClick={(idx) => setLightboxSrc(project.images![idx])}
                            />
                        </div>
                    </div>
                )}

                {/* Mobile carousel — multi-image */}
                {project.images && project.images.length > 0 && (
                    <div className="md:hidden relative w-full h-48 border-t border-slate-800/50">
                        <ImageCarousel
                            images={project.images}
                            alt={project.title}
                            onImageClick={(idx) => setLightboxSrc(project.images![idx])}
                        />
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {lightboxSrc && (
                    <LightboxModal
                        src={lightboxSrc}
                        alt={project.title}
                        onClose={() => setLightboxSrc(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
