"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/motion";
import { ATLAS_QUIET_EVENT } from "@/lib/zone";
import { SkillOrbitEngine } from "./engine";
import { SKILLS, PROJECTS, CATEGORIES, EVERY_PROJECT } from "./data";

/* ══════════════════════════════════════════════════════
   SkillOrbit — the interactive Stack field

   Six category stars with their skills in orbit. Click a
   body and the readout names the project that proves it;
   click that project and the whole field re-clusters around
   it. The play and the point are one gesture — which is the
   only reason this is worth more than the list it replaces.

   ── Scroll is never captured ──
   No wheel handler exists, so a wheel over the canvas
   scrolls the page like anywhere else. `pointerdown`
   hit-tests FIRST and only captures when it actually lands
   on a body; a miss is left entirely alone. Touch never
   drags at all. This repo has shipped a silently
   unscrollable page before and it is not obvious from the
   symptom what caused it.

   ── The list is not a fallback bolted on afterwards ──
   It is the server-rendered content and the accessible
   interface. The canvas is aria-hidden decoration layered
   over it. A synthetic a11y tree tracking 27 moving bodies
   would work badly for everyone; a real list works properly
   for keyboards, screen readers, no-JS and anyone who just
   wants to scan.
   ══════════════════════════════════════════════════════ */

/** Matches the CSS breakpoint below. Drag is pointer-only. */
const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCED = "(prefers-reduced-motion: reduce)";

function projectsFor(i: number) {
    const s = SKILLS[i];
    if (s.projects.includes(EVERY_PROJECT)) return PROJECTS;
    return PROJECTS.filter((p) => s.projects.includes(p.id));
}

export default function SkillOrbit({ children }: { children: React.ReactNode }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<SkillOrbitEngine | null>(null);
    const draggingRef = useRef(false);
    /** Re-offers the current box to the engine. Set up by the mount effect. */
    const sizeRef = useRef<(() => void) | null>(null);

    const [listView, setListView] = useState(false);
    const [selected, setSelected] = useState(-1);
    const [focusProject, setFocusProject] = useState<string | null>(null);

    /* ── Engine lifecycle ──────────────────────────── */
    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const reduced = window.matchMedia(REDUCED).matches;

        /* Read every colour from CSS rather than hardcoding it — same rule
           the atlas follows, so canvas and DOM cannot drift apart.

           This used to read the accent alone, and the canvas carried four
           hand-written colours beside it: `#e6ded2` for the starfield,
           `rgba(242,239,234,…)` for two label styles and
           `rgba(138,131,122,…)` for an unlit body. All four are warm greys
           left over from the amber-on-near-black scheme this palette
           replaced — CLAUDE.md records the same class of bug being cleared
           out of the atlas ("thirteen hardcoded rgba(34,211,238,…)
           literals"), and this file was simply not part of that pass.

           `--accent-rgb` is authored as `50 130 184` and the text tokens as
           hex, so the reader below takes both forms. */
        const root = getComputedStyle(document.documentElement);
        const readRgb = (
            prop: string,
            fallback: [number, number, number],
        ): [number, number, number] => {
            const raw = root.getPropertyValue(prop).trim();
            const hex = /^#([0-9a-f]{6})$/i.exec(raw);
            if (hex) {
                const n = parseInt(hex[1], 16);
                return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
            }
            const parts = raw.split(/[\s,/]+/).map(Number);
            return parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)
                ? [parts[0], parts[1], parts[2]]
                : fallback;
        };

        const accent = readRgb("--accent-rgb", [50, 130, 184]);
        const ice = readRgb("--text-primary", [187, 225, 250]);
        const muted = readRgb("--text-tertiary", [131, 155, 170]);

        /* The RESOLVED stack, never the `var()`. Canvas 2D parses `font` as a
           CSS shorthand with no element context, so a `var()` in it is never
           substituted — the assignment is rejected and the context silently
           keeps its previous value. Both label styles in the engine were
           written that way, so every label on this canvas was being drawn in
           the default `10px sans-serif`. See the `mono` field on `Palette`. */
        const mono =
            root.getPropertyValue("--font-jetbrains-mono").trim() ||
            "ui-monospace";

        const engine = new SkillOrbitEngine(
            canvas,
            ctx,
            { accent, ice, muted, mono },
            reduced,
        );
        engineRef.current = engine;

        /* Size it NOW, synchronously, before observing.

           ResizeObserver callbacks are delivered during the event loop's
           rendering steps — the same steps rAF runs in — so a document that is
           not currently rendering never gets one. Relying on it for the FIRST
           size leaves the canvas at its 300×150 default: laid out at full
           width in CSS, but with a backing store a third of the size and every
           body solved against a box that isn't the one on screen.

           And the mount-time measurement is not sufficient on its own either.
           If the stylesheet has not applied yet, the stage has no height —
           its children are a 100%-height canvas and absolutely positioned
           panels, so it collapses to zero — `resize` rejects the box, and with
           both the observer and rAF on the paused clock nothing ever asks
           again. The field stays dead with all 27 bodies stacked at the
           origin. Hence `ensureSized`, offered again at every entry point that
           is guaranteed to run after layout has settled. `resize` is
           idempotent, so offering a size that has not changed costs one
           already-needed rect read. */
        const ensureSized = () => {
            const el = wrapRef.current;
            const eng = engineRef.current;
            if (!el || !eng) return;
            const r = el.getBoundingClientRect();
            eng.resize(r.width, r.height);
            if (reduced) eng.drawStatic();
        };
        sizeRef.current = ensureSized;
        ensureSized();

        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            engine.resize(width, height);
            if (reduced) engine.drawStatic();
        });
        ro.observe(wrap);

        /* ── Only run while on screen ──────────────────
           The loop is the whole cost of this section, and the section is
           one of eight. Off screen it must cost nothing at all — and while
           it IS on screen the atlas stands down, because two animated
           canvases at once is how the frame drops came back last time. */
        let ticking = false;
        const tick = (time: number) => engine.step(time * 1000);

        const setRunning = (run: boolean) => {
            if (run === ticking) return;
            ticking = run;
            if (run) {
                engine.resetClock();
                gsap.ticker.add(tick);
            } else {
                gsap.ticker.remove(tick);
            }
            window.dispatchEvent(
                new CustomEvent(ATLAS_QUIET_EVENT, {
                    detail: { source: "stack", quiet: run },
                }),
            );
        };

        let onScreen = false;
        const io = new IntersectionObserver(
            ([entry]) => {
                onScreen = entry.isIntersecting;
                // Layout is certainly settled by the time this section
                // scrolls into view, whatever happened at mount.
                ensureSized();
                if (reduced) {
                    engine.drawStatic();
                    // Still ask the atlas to quiet down: the reason to is
                    // that this panel owns the reader's attention, not that
                    // it happens to be animating.
                    window.dispatchEvent(
                        new CustomEvent(ATLAS_QUIET_EVENT, {
                            detail: { source: "stack", quiet: onScreen },
                        }),
                    );
                    return;
                }
                setRunning(onScreen && !document.hidden);
            },
            { rootMargin: "80px 0px" },
        );
        io.observe(wrap);

        const onVisibility = () => {
            if (reduced) return;
            setRunning(onScreen && !document.hidden);
        };
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            io.disconnect();
            ro.disconnect();
            document.removeEventListener("visibilitychange", onVisibility);
            setRunning(false);
            engineRef.current = null;
        };
    }, []);

    /* ── Pointer ───────────────────────────────────── */

    const local = (e: React.PointerEvent) => {
        const r = e.currentTarget.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        const engine = engineRef.current;
        if (!engine) return;
        /* Last line of defence, and unconditional. A pointer is on the canvas,
           so layout has unambiguously happened.

           Checking `isSized()` first was not enough: that only catches an
           engine with NO box, while the failure that actually survives is a
           STALE one — the viewport changed, the ResizeObserver never fired,
           and hit testing then runs against bodies laid out for the old box,
           so clicks land on nothing. `resize` early-returns when the size is
           unchanged, and `local()` reads the same rect on this event anyway,
           so the common path costs nothing. */
        sizeRef.current?.();
        const { x, y } = local(e);

        // A star: regroup straight from the field.
        const anchor = engine.hitAnchor(x, y);
        if (anchor && anchor.kind === "project") {
            engine.setMode({ mode: "category" });
            setFocusProject(null);
            setSelected(-1);
            return;
        }

        const hit = engine.hitTest(x, y);
        if (hit < 0) return; // MISS — leave the event alone so the page scrolls.

        engine.select(hit);
        setSelected(hit);

        // Drag only with a fine pointer. On touch this stays a plain tap and
        // vertical scrolling is never contested.
        if (!window.matchMedia(FINE_POINTER).matches) return;

        e.currentTarget.setPointerCapture(e.pointerId);
        draggingRef.current = true;
        engine.beginDrag(hit);
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const engine = engineRef.current;
        if (!engine) return;
        const { x, y } = local(e);
        engine.setPointer(x, y);
        if (draggingRef.current) engine.moveDrag(x, y);
    }, []);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        engineRef.current?.endDrag();
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    }, []);

    const onPointerLeave = useCallback(() => {
        engineRef.current?.setPointer(null, null);
    }, []);

    /* ── Regroup ───────────────────────────────────── */

    const regroup = useCallback((projectId: string | null) => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.setMode(
            projectId ? { mode: "project", projectId } : { mode: "category" },
        );
        setFocusProject(projectId);
        setSelected(-1);
    }, []);

    const skill = selected >= 0 ? SKILLS[selected] : null;
    const active = PROJECTS.find((p) => p.id === focusProject);

    return (
        <div className="skill-orbit" data-list={listView ? "" : undefined}>
            {/* ── The viewport ── */}
            <div className="skill-orbit-frame" aria-hidden={listView}>
                <div className="skill-orbit-stage">
                    {/* The field. This element — NOT the whole stage — is what
                        the engine measures, so the solver's box stops at the
                        readout strip below and a body can never be positioned
                        underneath it.

                        The readout used to float in the bottom-left corner and
                        covered the Frontend system outright. No floating
                        position fixes that: the grid is 3×2, so all four
                        corners, the top centre and the bottom centre are each
                        occupied by a system. Taking the space out of the
                        field's geometry is the only arrangement where overlap
                        is impossible rather than merely unlikely. */}
                    <div ref={wrapRef} className="skill-orbit-field">
                        <canvas
                            ref={canvasRef}
                            className="skill-orbit-canvas"
                            aria-hidden="true"
                            data-cursor="probe"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            onPointerLeave={onPointerLeave}
                        />

                        {active && (
                            <button
                                type="button"
                                onClick={() => regroup(null)}
                                className="skill-orbit-reset"
                            >
                                ← Back to categories
                            </button>
                        )}
                    </div>

                    {/* Readout strip. Fixed height whatever it holds, so
                        selecting a body never reflows the page under the
                        reader's cursor. */}
                    <div className="skill-orbit-readout">
                        {skill ? (
                            <>
                                <div className="skill-orbit-readout-head">
                                    <p className="label-muted">Selected</p>
                                    <p className="skill-orbit-readout-name">
                                        {skill.name}
                                    </p>
                                </div>
                                <div className="skill-orbit-readout-body">
                                    <p className="body-sm">
                                        {skill.projects.length === 0
                                            ? "Coursework — no shipped project behind this one."
                                            : "Proven in"}
                                    </p>
                                    {skill.projects.length > 0 && (
                                        /* Scrolls horizontally on narrow
                                           screens, so it has to opt out of
                                           Lenis or the page glides instead of
                                           the row — same rule as the command
                                           palette's results list. */
                                        <div
                                            className="skill-orbit-chips"
                                            data-lenis-prevent=""
                                        >
                                            {projectsFor(selected).map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => regroup(p.id)}
                                                    className="skill-orbit-chip"
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="skill-orbit-readout-head">
                                    <p className="label-muted">
                                        {active ? "Regrouped by" : "Stack field"}
                                    </p>
                                    <p className="skill-orbit-readout-name">
                                        {active ? active.label : "Six systems"}
                                    </p>
                                </div>
                                <div className="skill-orbit-readout-body">
                                    <p className="body-sm">
                                        {active
                                            ? "Everything this project actually took, pulled into one orbit."
                                            : "Tap a body to see where it was used."}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Controls ──
                Both hints are rendered and CSS picks one, the same mechanism
                that picks the view itself. State would get this wrong without
                JS: `listView` is false in the server-rendered HTML, so a
                state-driven hint would tell a no-JS reader to drag bodies in
                a canvas that will never exist. */}
            <div className="skill-orbit-controls">
                <p className="body-sm text-tertiary skill-orbit-hint">
                    <span className="skill-orbit-hint--orbit">
                        Drag a body to pull it out of orbit. Click one to see
                        the project behind it.
                    </span>
                    <span className="skill-orbit-hint--list">
                        Every tool listed against the work that used it.
                    </span>
                </p>
                <button
                    type="button"
                    onClick={() => setListView((v) => !v)}
                    className="skill-orbit-toggle"
                >
                    {listView ? "Orbit view" : "List view"}
                </button>
            </div>

            {/* ── The list ──
                Server-rendered, always in the DOM, hidden visually while the
                canvas is showing. Screen readers, keyboards and no-JS clients
                use this; the toggle brings it back for anyone who just wants
                to read it. */}
            <div className="skill-orbit-list">{children}</div>
        </div>
    );
}

/** Category ids and labels, for the list heading — one source with the canvas. */
export { CATEGORIES };
