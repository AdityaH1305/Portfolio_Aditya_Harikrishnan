"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { lockScroll, unlockScroll, scrollToSection } from "@/lib/lenis";
import { CASE_STUDIES } from "@/lib/caseStudies";
import { paletteEvent, track } from "@/lib/analytics";
import {
    ACTION_COPY_EMAIL,
    ACTION_COPY_LINK,
    ACTION_GAME,
    ACTION_PRINT,
    ACTION_REPLAY_ENTRANCE,
    ACTION_SHORTCUTS,
    commandsFor,
    filterCommands,
    type CommandSpec,
} from "@/lib/commands";
import { EMAIL } from "@/lib/site";
import { expiredClearance } from "@/components/SignalGate/gate";
import useFocusTrap from "@/hooks/useFocusTrap";

/* The `Command` interface, the `NAV` array and the whole `getCommands` table
   used to live here. They are in lib/commands.ts now — as DATA rather than
   closures, so the one thing worth asserting about them (that the Navigate
   rows change verb off the home page, where the section ids do not exist)
   became testable. That bug shipped: seven rows, present and selectable, that
   did nothing at all on every /work/* route. */

const REPORT_URL = "/ludex-technical-report.pdf";

const openExternal = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

/* Best-effort, and deliberately quiet.

   `navigator.clipboard` is unavailable on an insecure origin and can be
   refused outright by permissions policy. There is nowhere on screen to
   report that — the palette has already closed — and a copy that silently did
   not happen is a small loss next to a thrown promise in the console of a
   portfolio. */
async function copy(text: string): Promise<void> {
    try {
        await navigator.clipboard?.writeText(text);
    } catch {
        /* No clipboard. Nothing to do and nothing to say. */
    }
}

export default function CommandPalette({
    onOpenGame,
    onOpenShortcuts,
}: {
    /** Both owned by components/SiteCommands.tsx, which owns the overlays. */
    onOpenGame: () => void;
    onOpenShortcuts: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [render, setRender] = useState(false);
    const [shown, setShown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    /* The list is now a pure function of the route — see lib/commands.ts on
       why the seven Navigate rows have to change verb off the home page. */
    const commands = commandsFor(pathname);
    const filtered = filterCommands(commands, query);

    /* Reset query and selection on every toggle rather than in an
       effect — setState inside an effect triggers a cascading render
       on each keystroke. */
    const togglePalette = useCallback(() => {
        setOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
    }, []);

    // Global shortcut: Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                togglePalette();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [togglePalette]);

    /* Mount/visibility split.

       GSAP has no equivalent of AnimatePresence's unmount deferral, so the
       exit transition needs the element to stay mounted while it plays.
       `render` controls presence in the DOM, `shown` controls the visual
       state, and onTransitionEnd unmounts once the fade finishes. This is
       the same pattern SpaceInvadersModal already uses. */
    // Mount as soon as `open` flips true. A render-phase update rather than
    // an effect, so the element is in the DOM before the browser paints.
    if (open && !render) setRender(true);

    useEffect(() => {
        // Both branches schedule inside rAF: a synchronous setState in an
        // effect body causes a cascading render, and the entry transition
        // needs a painted "from" state to animate away from anyway.
        if (open) {
            const id = requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    setShown(true);
                    inputRef.current?.focus();
                }),
            );
            return () => cancelAnimationFrame(id);
        }
        const id = requestAnimationFrame(() => setShown(false));
        return () => cancelAnimationFrame(id);
    }, [open]);

    const handleTransitionEnd = useCallback(() => {
        if (!shown) setRender(false);
    }, [shown]);

    /* Lock scroll when open.
       body{overflow:hidden} does not stop Lenis — it binds wheel/touchmove
       on window and drives scroll itself. The lock is reference-counted
       because choosing the game command unlocks here while the game modal
       locks in an overlapping effect. */
    useEffect(() => {
        if (!open) return;
        /* HERE rather than in `togglePalette`, which also CLOSES — and a side
           effect inside a `setOpen(prev => …)` updater is wrong under
           StrictMode, where updaters are double-invoked. This effect runs
           exactly once per open, after commit. */
        track("palette_opened");
        lockScroll();
        return unlockScroll;
    }, [open]);

    /* `render`, not `open`: the panel stays mounted through the close
       transition, and tearing the trap down early would restore focus while
       the palette is still on screen. `inputRef` is handed in because this
       component already focuses the search field itself — without it the trap
       and that effect would fight over the first frame. */
    useFocusTrap(panelRef, render, inputRef);

    /* ── The four verbs ──
       lib/commands.ts decides WHICH verb a row gets; this decides what each
       verb does. Keeping them apart is what let the routing rule become a
       unit test instead of a closure nobody could assert on. */
    const perform = useCallback(
        (cmd: CommandSpec) => {
            switch (cmd.kind) {
                case "scroll":
                    scrollToSection(cmd.payload);
                    return;
                case "route":
                    router.push(cmd.payload);
                    return;
                case "external":
                    openExternal(cmd.payload);
                    return;
                case "action":
                    switch (cmd.payload) {
                        case ACTION_COPY_LINK:
                            void copy(window.location.href);
                            return;
                        case ACTION_COPY_EMAIL:
                            void copy(EMAIL);
                            return;
                        case ACTION_PRINT:
                            window.print();
                            return;
                        case ACTION_GAME:
                            onOpenGame();
                            return;
                        case ACTION_SHORTCUTS:
                            onOpenShortcuts();
                            return;
                        case ACTION_REPLAY_ENTRANCE:
                            /* Backdated, never deleted — gate.ts documents why
                               (a deleted key reads as "no clearance exists",
                               which is a different state). The gate itself does
                               not return until the next load, by design, so
                               this reloads. */
                            expiredClearance();
                            window.location.reload();
                            return;
                    }
            }
        },
        [router, onOpenGame, onOpenShortcuts],
    );

    const runCommand = useCallback((cmd: CommandSpec) => {
        setOpen(false);

        /* THE ONE PLACE THAT NEEDS AN IMPERATIVE CALL. Telemetry's delegated
           listener sees anchor clicks; `openExternal` is `window.open`, so
           there is no DOM event for it to see. Routed through `paletteEvent`
           into the SAME named events as the DOM surfaces rather than a
           parallel `command_run` funnel, so "how many resume views" stays one
           answerable number instead of two you have to remember to add up.
           The seven NAV ids map to null. */
        const hit = paletteEvent(
            cmd.id,
            CASE_STUDIES.map((c) => c.slug),
            REPORT_URL,
        );
        if (hit) track(hit.name, hit.props);

        /* Release the lock HERE rather than leaving it to the effect cleanup.
           React has not committed the close yet when this runs, so the
           cleanup — and therefore lenis.start() — has not happened; a scroll
           issued now would be against a stopped instance and go nowhere.
           The cleanup unlocking again is harmless: the count clamps at 0.

           The rAF then lets the close commit before the scroll begins, so
           the palette fades as the page starts moving. */
        unlockScroll();
        requestAnimationFrame(() => perform(cmd));
    }, [perform]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((i) => (i + 1) % filtered.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[selectedIndex]) {
                    runCommand(filtered[selectedIndex]);
                }
            }
        },
        [filtered, selectedIndex, runCommand]
    );

    // Group filtered commands by section
    const grouped: {
        section: string;
        items: (CommandSpec & { globalIndex: number })[];
    }[] = [];
    let globalIdx = 0;
    for (const cmd of filtered) {
        const existing = grouped.find((g) => g.section === cmd.section);
        const item = { ...cmd, globalIndex: globalIdx };
        if (existing) {
            existing.items.push(item);
        } else {
            grouped.push({ section: cmd.section, items: [item] });
        }
        globalIdx++;
    }

    if (!render) return null;

    return (
        <div
            onTransitionEnd={handleTransitionEnd}
            className={`fixed inset-0 z-[9998] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm transition-opacity duration-150 ${
                shown ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setOpen(false)}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
        >
            <div
                className={`w-full max-w-[520px] mx-4 rounded-xl border border-edge-strong bg-surface-1/95 shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-150 ease-out ${
                    shown
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-[0.96] -translate-y-2"
                }`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {/* Search input.

                    `py-3-default` was here — not a class, so it produced
                    nothing, and the row lost both its vertical padding and the
                    rule under it. With no `tailwind.config.js` a class name is
                    only real if it is generated or declared, and nothing warns:
                    `tsc`, ESLint and the build all pass and the element simply
                    renders unstyled. CLAUDE.md records the same failure under
                    "A class name that doesn't exist fails silently". */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-edge-default">
                    <svg
                        className="w-4 h-4 text-accent shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        ref={inputRef}
                        data-cursor="text"
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Type a command…"
                        className="command-palette-input flex-1 bg-transparent text-sm text-primary placeholder:text-tertiary outline-none"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono text-primary rounded bg-surface-3">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                {/* data-lenis-prevent: without it Lenis swallows wheel
                    events here and the results list can't scroll. */}
                <div
                    className="max-h-[320px] overflow-y-auto py-2"
                    data-lenis-prevent
                >
                    {filtered.length === 0 && (
                        <p className="px-4 py-6 text-sm text-tertiary text-center">
                            No results found.
                        </p>
                    )}

                    {grouped.map((group) => (
                        <div key={group.section}>
                            <p className="px-4 pt-2 pb-1 text-xs font-mono uppercase tracking-widest text-accent">
                                {group.section}
                            </p>
                            {group.items.map((cmd) => (
                                <button
                                    key={cmd.id}
                                    onClick={() => runCommand(cmd)}
                                    onMouseEnter={() => setSelectedIndex(cmd.globalIndex)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-100 ${
                                        cmd.globalIndex === selectedIndex
                                            ? "bg-accent/10 text-accent font-medium border-l-2 border-accent"
                                            : "text-secondary hover:bg-surface-3 border-l-2 border-transparent"
                                    }`}
                                >
                                    <span className="w-5 text-center text-xs text-tertiary">
                                        {cmd.icon}
                                    </span>
                                    <span className="flex-1">{cmd.label}</span>
                                    {cmd.globalIndex === selectedIndex && (
                                        <span className="text-xs text-accent font-mono">
                                            ↵
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="flex items-center justify-between px-4 py-2 text-xs font-mono text-tertiary bg-surface-1/60">
                    <span>↑↓ navigate</span>
                    <span>↵ select</span>
                    <span>esc close</span>
                </div>
            </div>
        </div>
    );
}
