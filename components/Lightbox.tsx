"use client";

import { useCallback, useEffect, useState } from "react";
import { lockScroll, unlockScroll } from "@/lib/lenis";

/* ══════════════════════════════════════════════════════
   Lightbox — fullscreen image viewer

   Extracted from ProjectsEnhanced so the project cards and
   both figure galleries share one implementation instead of
   three.

   Renders a raw <img>, not next/image: the whole point is
   the source at full resolution, and the natural dimensions
   vary per image so there is no box to fill.
   ══════════════════════════════════════════════════════ */

export interface LightboxImage {
    src: string;
    alt: string;
    /** Optional line shown under the image. */
    caption?: string;
}

export default function Lightbox({
    images,
    index,
    onNavigate,
    onClose,
}: {
    images: LightboxImage[];
    index: number;
    onNavigate: (idx: number) => void;
    onClose: () => void;
}) {
    const canNavigate = images.length > 1;
    const current = images[index];

    const goPrev = useCallback(() => {
        if (!canNavigate) return;
        onNavigate((index - 1 + images.length) % images.length);
    }, [canNavigate, index, images.length, onNavigate]);

    const goNext = useCallback(() => {
        if (!canNavigate) return;
        onNavigate((index + 1) % images.length);
    }, [canNavigate, index, images.length, onNavigate]);

    const handleKey = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
        },
        [onClose, goPrev, goNext],
    );

    /* body{overflow:hidden} does not stop Lenis — it drives scroll from its
       own wheel handlers — so the page would glide behind the overlay. */
    useEffect(() => {
        lockScroll();
        window.addEventListener("keydown", handleKey);
        return () => {
            unlockScroll();
            window.removeEventListener("keydown", handleKey);
        };
    }, [handleKey]);

    /* Enter transition only; unmounts immediately on close. */
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() =>
            requestAnimationFrame(() => setShown(true)),
        );
        return () => cancelAnimationFrame(id);
    }, []);

    if (!current) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={current.alt}
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-zoom-out transition-opacity duration-[250ms] ${
                shown ? "opacity-100" : "opacity-0"
            }`}
            onClick={onClose}
        >
            <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center
                           text-white/60 hover:text-white text-2xl leading-none
                           transition-colors duration-200"
            >
                ×
            </button>

            <div
                className={`relative max-w-[92vw] transition-all duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    shown ? "opacity-100 scale-100" : "opacity-0 scale-95"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={current.src}
                    alt={current.alt}
                    className="max-w-full max-h-[82vh] object-contain block mx-auto cursor-default"
                />

                {(current.caption || canNavigate) && (
                    <div className="mt-4 flex items-baseline gap-4">
                        {current.caption && (
                            <p className="body-sm text-tertiary max-w-2xl">
                                {current.caption}
                            </p>
                        )}
                        {canNavigate && (
                            <span className="ml-auto mono text-xs text-quaternary shrink-0">
                                {index + 1} / {images.length}
                            </span>
                        )}
                    </div>
                )}

                {canNavigate && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                goPrev();
                            }}
                            className="absolute -left-4 md:-left-16 top-1/2 -translate-y-1/2 w-11 h-11
                                       flex items-center justify-center rounded-full
                                       bg-black/70 border border-edge-default
                                       text-white/70 hover:text-white hover:bg-black
                                       transition-colors duration-200 text-2xl leading-none"
                            aria-label="Previous image"
                        >
                            ‹
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                goNext();
                            }}
                            className="absolute -right-4 md:-right-16 top-1/2 -translate-y-1/2 w-11 h-11
                                       flex items-center justify-center rounded-full
                                       bg-black/70 border border-edge-default
                                       text-white/70 hover:text-white hover:bg-black
                                       transition-colors duration-200 text-2xl leading-none"
                            aria-label="Next image"
                        >
                            ›
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
