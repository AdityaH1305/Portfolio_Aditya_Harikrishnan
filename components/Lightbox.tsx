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

   Portrait images are NOT fitted to the viewport height. Doing
   that to a 916×1717 diagram leaves it 393px wide — narrower
   than it was in the gallery, so "zoom" made it worse. When
   `w`/`h` say an image is distinctly taller than it is wide, it
   renders at native width and the overlay scrolls instead.
   ══════════════════════════════════════════════════════ */

export interface LightboxImage {
    src: string;
    alt: string;
    /** Optional line shown under the image. */
    caption?: string;
    /** Natural pixel size. Enables the portrait path when known. */
    w?: number;
    h?: number;
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

    /* Distinctly portrait — square and landscape still fit to height. */
    const tall = !!(current.w && current.h && current.h / current.w > 1.2);

    const arrowBase =
        "w-11 h-11 rounded-full flex items-center justify-center " +
        "text-2xl leading-none pb-0.5 border border-edge-strong bg-surface-1 " +
        "text-secondary hover:text-accent hover:border-accent hover:bg-surface-2 " +
        "transition-colors duration-200";

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={current.alt}
            /* The overlay is the scroller on the portrait path, so it has to
               opt out of Lenis or the page moves underneath instead. */
            data-lenis-prevent=""
            className={`fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-md cursor-zoom-out transition-opacity duration-[250ms] ${
                shown ? "opacity-100" : "opacity-0"
            }`}
            onClick={onClose}
        >
            <button
                onClick={onClose}
                aria-label="Close"
                className="fixed top-5 right-5 z-10 w-10 h-10 flex items-center justify-center
                           text-white/60 hover:text-white text-2xl leading-none
                           transition-colors duration-200"
            >
                ×
            </button>

            {/* The scroll area takes the height the control row leaves, so the
                controls are a sibling of the image rather than floating over
                it. `m-auto` on the child centres when there is room and, unlike
                justify-center, does not clip the top when there isn't. */}
            <div className="flex-1 min-h-0 overflow-auto flex">
                <div
                    className={`relative m-auto px-4 py-10 transition-all duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        tall ? "w-fit" : "max-w-[92vw]"
                    } ${shown ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={current.src}
                        alt={current.alt}
                        /* Native width where the viewport allows it, never
                           below 640px — panning a readable diagram beats
                           fitting an unreadable one. */
                        style={
                            tall
                                ? {
                                      width: `min(${current.w}px, max(92vw, 640px))`,
                                  }
                                : undefined
                        }
                        /* max-w-none is load-bearing: preflight's
                           `img { max-width: 100% }` otherwise clamps the
                           explicit width back to the wrapper and the portrait
                           path silently reverts to a shrunken figure. */
                        className={`block mx-auto cursor-default rounded-lg ${
                            tall
                                ? "h-auto max-w-none"
                                : "max-w-full max-h-[72vh] object-contain"
                        }`}
                    />

                    {current.caption && (
                        <p className="mt-4 body-sm text-tertiary max-w-2xl mx-auto">
                            {current.caption}
                        </p>
                    )}
                </div>
            </div>

            {canNavigate && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 flex justify-center pb-6 pt-1 cursor-default"
                >
                    <div
                        className="flex items-center gap-2 rounded-full px-3 py-2
                                   bg-surface-0/95 backdrop-blur-sm border border-edge-strong shadow-xl"
                    >
                        <button
                            onClick={goPrev}
                            className={arrowBase}
                            aria-label="Previous image"
                        >
                            ‹
                        </button>
                        <span className="mono text-xs text-secondary tabular-nums w-12 text-center">
                            {index + 1} / {images.length}
                        </span>
                        <button
                            onClick={goNext}
                            className={arrowBase}
                            aria-label="Next image"
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
