"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { lockScroll, unlockScroll, scrollToSection } from "@/lib/lenis";
import { CASE_STUDIES } from "@/lib/caseStudies";

const RESUME_URL =
    "https://drive.google.com/file/d/1vzrKEpDGGLUcU3jRtCm9lk6MLR7-7NG-/view?usp=sharing";

interface Command {
    id: string;
    label: string;
    section: string;
    icon: string;
    action: () => void;
}

const REPORT_URL = "/ludex-technical-report.pdf";

/** Navigate entries mirror SideNav's `sections` array. */
const NAV: { id: string; label: string; icon: string }[] = [
    { id: "intro", label: "Intro", icon: "↑" },
    { id: "research", label: "Approach", icon: "→" },
    { id: "work", label: "Projects", icon: "★" },
    { id: "projects", label: "Experiments", icon: "◆" },
    { id: "stack", label: "Stack", icon: "→" },
    { id: "journey", label: "Journey", icon: "→" },
    { id: "contact", label: "Contact", icon: "✉" },
];

const openExternal = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

function getCommands(
    onOpenGame: () => void,
    push: (href: string) => void,
): Command[] {
    return [
        ...NAV.map(({ id, label, icon }) => ({
            id,
            label,
            icon,
            section: "Navigate",
            action: () => scrollToSection(id),
        })),
        ...CASE_STUDIES.map((study) => ({
            id: study.slug,
            label: study.title,
            icon: "▸",
            section: "Projects",
            action: () => push(`/work/${study.slug}`),
        })),
        {
            id: "resume",
            label: "Resume",
            section: "Links",
            icon: "↗",
            action: () => openExternal(RESUME_URL),
        },
        {
            id: "report",
            label: "Ludex Technical Report (PDF)",
            section: "Links",
            icon: "↗",
            action: () => openExternal(REPORT_URL),
        },
        {
            id: "github",
            label: "GitHub",
            section: "Links",
            icon: "↗",
            action: () => openExternal("https://github.com/AdityaH1305"),
        },
        {
            id: "stress-test",
            label: "Initialize System Stress Test",
            section: "System",
            icon: "▶",
            action: onOpenGame,
        },
    ];
}

export default function CommandPalette({
    onOpenGame,
}: {
    onOpenGame: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [render, setRender] = useState(false);
    const [shown, setShown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const commands = getCommands(onOpenGame, (href) => router.push(href));

    const filtered = query.trim()
        ? commands.filter((c) =>
              c.label.toLowerCase().includes(query.toLowerCase())
          )
        : commands;

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
        lockScroll();
        return unlockScroll;
    }, [open]);

    const runCommand = useCallback((cmd: Command) => {
        setOpen(false);

        /* Release the lock HERE rather than leaving it to the effect cleanup.
           React has not committed the close yet when this runs, so the
           cleanup — and therefore lenis.start() — has not happened; a scroll
           issued now would be against a stopped instance and go nowhere.
           The cleanup unlocking again is harmless: the count clamps at 0.

           The rAF then lets the close commit before the scroll begins, so
           the palette fades as the page starts moving. */
        unlockScroll();
        requestAnimationFrame(() => cmd.action());
    }, []);

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
    const grouped: { section: string; items: (Command & { globalIndex: number })[] }[] = [];
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
                        {/* Search input */}
                        <div className="flex items-center gap-3 px-4 py-3-default">
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
                                className="flex-1 bg-transparent text-sm text-primary placeholder:text-tertiary outline-none"
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
