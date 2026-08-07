"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
    { id: "work", label: "Ludex Case Study", icon: "★" },
    { id: "projects", label: "Projects", icon: "◆" },
    { id: "research", label: "Approach", icon: "→" },
    { id: "stack", label: "Stack", icon: "→" },
    { id: "journey", label: "Journey", icon: "→" },
    { id: "contact", label: "Contact", icon: "✉" },
];

const openExternal = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

function getCommands(onOpenGame: () => void): Command[] {
    return [
        ...NAV.map(({ id, label, icon }) => ({
            id,
            label,
            icon,
            section: "Navigate",
            action: () => {
                document
                    .getElementById(id)
                    ?.scrollIntoView({ behavior: "smooth" });
            },
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
    const inputRef = useRef<HTMLInputElement>(null);

    const commands = getCommands(onOpenGame);

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

    // Focus input when opened — one frame later so the entry animation starts first
    useEffect(() => {
        if (!open) return;
        const id = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(id);
    }, [open]);

    // Lock scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    const runCommand = useCallback(
        (cmd: Command) => {
            setOpen(false);
            // Small delay so the close animation plays before action
            requestAnimationFrame(() => {
                cmd.action();
            });
        },
        []
    );

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

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[9998] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Command Palette"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -8 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="w-full max-w-[520px] mx-4 rounded-xl border border-edge-strong bg-surface-2/95 shadow-2xl overflow-hidden backdrop-blur-xl"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={handleKeyDown}
                    >
                        {/* Search input */}
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
                            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-tertiary border border-edge-default rounded bg-surface-3">
                                ESC
                            </kbd>
                        </div>

                        {/* Results */}
                        <div className="max-h-[320px] overflow-y-auto py-2">
                            {filtered.length === 0 && (
                                <p className="px-4 py-6 text-sm text-tertiary text-center">
                                    No results found.
                                </p>
                            )}

                            {grouped.map((group) => (
                                <div key={group.section}>
                                    <p className="px-4 pt-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-accent/60">
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
                                                <span className="text-[10px] text-accent font-mono">
                                                    ↵
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Footer hint */}
                        <div className="flex items-center justify-between px-4 py-2 border-t border-edge text-[10px] font-mono text-tertiary bg-surface-1/60">
                            <span>↑↓ navigate</span>
                            <span>↵ select</span>
                            <span>esc close</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
