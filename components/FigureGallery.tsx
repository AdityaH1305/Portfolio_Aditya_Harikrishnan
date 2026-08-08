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

   Sizing rules, all learned the hard way:

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

   • `tall` figures opt out of the height cap entirely. Fitting
     a 916×1717 diagram into 70vh leaves it ~336px wide — a 2.7×
     downscale that renders its labels as 4px mush. Instead the
     panel gets a height cap and the figure renders near its
     native width, so the text is sharp and the reader scrolls.

   Controls sit BELOW the panel, never over it. Overlaid arrows
   covered parts of every figure, and there is no room to put
   them outside either: `.side-nav` is fixed at left:1.5rem,
   top:50%, exactly where a centred left arrow would land.
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
    /** Portrait figure: render near native width, scroll the panel instead. */
    tall?: boolean;
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
        "w-10 h-10 rounded-full shrink-0 " +
        "flex items-center justify-center text-xl leading-none pb-0.5 " +
        "bg-surface-1 border border-edge-strong " +
        "text-secondary hover:text-accent hover:border-accent hover:bg-surface-2 " +
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

            <div className="shell-bezel">
                <div className="core-bezel overflow-hidden">
                    <div
                        role="tabpanel"
                        id={`${idPrefix}-panel-${figure.id}`}
                        aria-labelledby={`${idPrefix}-tab-${figure.id}`}
                        /* Focusable so the panel can be scrolled from the
                           keyboard — which the tall figures now require. */
                        tabIndex={0}
                        /* Any inner scroller has to opt out of Lenis, or the
                           page glides instead of the panel. */
                        data-lenis-prevent={
                            figure.tall || figure.minW ? "" : undefined
                        }
                        className={
                            figure.tall
                                ? "overflow-auto max-h-[74vh]"
                                : figure.minW
                                  ? "overflow-x-auto"
                                  : "p-3"
                        }
                    >
                        <div
                            className={`${figure.minW ?? ""} ${
                                figure.minW || figure.tall ? "p-3" : ""
                            }`}
                        >
                            {/* The cap lives on this div, and the button
                                is w-full inside it. Putting max-width on
                                the button itself collapses the figure to
                                0×0: a button shrink-wraps its content,
                                and the content is w-full of the button. */}
                            <div
                                className="mx-auto"
                                style={{
                                    maxWidth: figure.tall
                                        ? `${figure.w}px`
                                        : `min(100%, calc(${
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

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <p className="body-sm text-tertiary max-w-2xl flex-1">
                    {figure.caption}
                    {figure.tall && (
                        <span className="text-quaternary">
                            {" "}
                            Scroll the panel to read it, or enlarge for the
                            full diagram.
                        </span>
                    )}
                </p>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setZoomed(active)}
                        className="mono text-xs text-tertiary hover:text-accent transition-colors duration-200 px-1"
                    >
                        Enlarge ⤢
                    </button>

                    {many && (
                        <>
                            <span
                                aria-hidden="true"
                                className="w-px h-5 bg-edge mx-1"
                            />
                            <button
                                type="button"
                                onClick={() => go(-1)}
                                aria-label="Previous figure"
                                className={arrowBase}
                            >
                                ‹
                            </button>
                            <span className="mono text-xs text-quaternary tabular-nums w-12 text-center">
                                {active + 1} / {figures.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => go(1)}
                                aria-label="Next figure"
                                className={arrowBase}
                            >
                                ›
                            </button>
                        </>
                    )}
                </div>
            </div>

            {zoomed !== null && (
                <Lightbox
                    images={figures.map((f) => ({
                        src: f.src,
                        alt: f.alt,
                        caption: f.caption,
                        w: f.w,
                        h: f.h,
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
