"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Lightbox from "@/components/Lightbox";
import { useTabUnderline } from "@/lib/useTabUnderline";

/* ══════════════════════════════════════════════════════
   FigureGallery

   The tabbed figure viewer shared by the Gait and Double
   U-Net case studies: named tabs, prev/next arrows, and
   click-to-zoom into the full-resolution source.

   Sizing rules, both learned the hard way:

   • Every figure is capped by a max-WIDTH derived from its
     own aspect ratio, not by `max-h` + `w-auto`. Auto width
     resolves against an image's natural size, which is 0
     until a lazy image loads — a portrait figure styled
     that way collapses to 0×0. A width cap is definite from
     first paint, and for wide figures `min()` picks 100% so
     it never binds.

   • Wide figures additionally carry a `minW`, so on narrow
     screens they pan inside the panel instead of shrinking
     into illegibility. The panel scrolls, never the page.
   ══════════════════════════════════════════════════════ */

export interface Figure {
    id: string;
    label: string;
    caption: string;
    src: string;
    w: number;
    h: number;
    alt: string;
    /** Tailwind min-width class — wide figures pan on small screens. */
    minW?: string;
    /** Fraction of viewport height the figure may occupy. Default 0.7. */
    maxVh?: number;
}

export default function FigureGallery({
    figures,
    idPrefix,
    ariaLabel,
}: {
    figures: Figure[];
    /** Namespaces tab/panel ids so two galleries can coexist on one page. */
    idPrefix: string;
    ariaLabel: string;
}) {
    const [active, setActive] = useState(0);
    const [zoomed, setZoomed] = useState<number | null>(null);
    const { rowRef, tabRefs, underlineRef } = useTabUnderline(active);

    const figure = figures[active];
    const many = figures.length > 1;

    const go = useCallback(
        (delta: number) =>
            setActive((i) => (i + delta + figures.length) % figures.length),
        [figures.length],
    );

    /* Left/Right on the tablist, per the ARIA tabs pattern. Home/End too —
       cheap to support and expected once roving arrows exist. */
    const onTabKeyDown = (e: React.KeyboardEvent) => {
        const keys: Record<string, number | undefined> = {
            ArrowLeft: -1,
            ArrowRight: 1,
        };
        if (keys[e.key] !== undefined) {
            e.preventDefault();
            const next =
                (active + keys[e.key]! + figures.length) % figures.length;
            setActive(next);
            tabRefs.current[next]?.focus();
        } else if (e.key === "Home" || e.key === "End") {
            e.preventDefault();
            const next = e.key === "Home" ? 0 : figures.length - 1;
            setActive(next);
            tabRefs.current[next]?.focus();
        }
    };

    const arrowBase =
        "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full " +
        "flex items-center justify-center text-xl leading-none " +
        "bg-surface-2/90 backdrop-blur border border-edge-default " +
        "text-secondary hover:text-primary hover:border-edge-strong " +
        "transition-colors duration-200";

    return (
        <>
            {/* rowRef must stay relative and be the direct offsetParent of the
                buttons — the underline tween reads offsetLeft. */}
            <div
                ref={rowRef}
                role="tablist"
                aria-label={ariaLabel}
                onKeyDown={onTabKeyDown}
                className="flex flex-wrap gap-6 mb-5 relative"
            >
                {figures.map((f, i) => (
                    <button
                        key={f.id}
                        ref={(el) => {
                            tabRefs.current[i] = el;
                        }}
                        role="tab"
                        id={`${idPrefix}-tab-${f.id}`}
                        aria-selected={active === i}
                        aria-controls={`${idPrefix}-panel-${f.id}`}
                        tabIndex={active === i ? 0 : -1}
                        onClick={() => setActive(i)}
                        className={`text-sm font-medium pb-1.5 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                            active === i
                                ? "text-primary"
                                : "text-tertiary hover:text-secondary"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
                <span
                    ref={underlineRef}
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-px w-0 bg-accent pointer-events-none"
                />
            </div>

            <div className="relative">
                <div className="shell-bezel">
                    <div className="core-bezel overflow-hidden">
                        <div
                            role="tabpanel"
                            id={`${idPrefix}-panel-${figure.id}`}
                            aria-labelledby={`${idPrefix}-tab-${figure.id}`}
                            className={figure.minW ? "overflow-x-auto" : "p-3"}
                        >
                            <div className={figure.minW ? `${figure.minW} p-3` : ""}>
                                {/* The cap lives on this div, and the button
                                    is w-full inside it. Putting max-width on
                                    the button itself collapses the figure to
                                    0×0: a button shrink-wraps its content,
                                    and the content is w-full of the button. */}
                                <div
                                    className="mx-auto"
                                    style={{
                                        maxWidth: `min(100%, calc(${
                                            figure.maxVh ?? 0.7
                                        } * 100vh * ${figure.w} / ${figure.h}))`,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setZoomed(active)}
                                        aria-label={`Zoom into ${figure.label}`}
                                        className="block w-full cursor-zoom-in group/zoom"
                                    >
                                        <Image
                                            src={figure.src}
                                            alt={figure.alt}
                                            width={figure.w}
                                            height={figure.h}
                                            sizes="(max-width: 768px) 100vw, 940px"
                                            className="w-full h-auto block rounded-lg transition-opacity duration-200 group-hover/zoom:opacity-90"
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {many && (
                    <>
                        <button
                            type="button"
                            onClick={() => go(-1)}
                            aria-label="Previous figure"
                            className={`${arrowBase} left-2 md:-left-5`}
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            onClick={() => go(1)}
                            aria-label="Next figure"
                            className={`${arrowBase} right-2 md:-right-5`}
                        >
                            ›
                        </button>
                    </>
                )}
            </div>

            <div className="mt-4 flex items-baseline gap-4">
                <p className="body-sm text-tertiary max-w-2xl">
                    {figure.caption}
                </p>
                {many && (
                    <span className="ml-auto mono text-xs text-quaternary shrink-0">
                        {active + 1} / {figures.length}
                    </span>
                )}
            </div>

            {zoomed !== null && (
                <Lightbox
                    images={figures.map((f) => ({
                        src: f.src,
                        alt: f.alt,
                        caption: f.caption,
                    }))}
                    index={zoomed}
                    onNavigate={(i) => {
                        setZoomed(i);
                        // Keep the tab row in step, so closing lands on the
                        // figure the reader actually ended on.
                        setActive(i);
                    }}
                    onClose={() => setZoomed(null)}
                />
            )}
        </>
    );
}
