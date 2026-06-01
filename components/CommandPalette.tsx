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

function getCommands(onOpenGame: () => void): Command[] {
    return [
        {
            id: "home",
            label: "Home",
            section: "Navigate",
            icon: "↑",
            action: () => {
                document.getElementById("home")?.scrollIntoView({ behavior: "smooth" });
            },
        },
        {
            id: "about",
            label: "About",
            section: "Navigate",
            icon: "→",
            action: () => {
                document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
            },
        },
        {
            id: "featured",
            label: "Featured Project",
            section: "Navigate",
            icon: "★",
            action: () => {
                document.getElementById("featured-project")?.scrollIntoView({ behavior: "smooth" });
            },
        },
        {
            id: "projects",
            label: "Projects",
            section: "Navigate",
            icon: "◆",
            action: () => {
                document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
            },
        },
        {
            id: "contact",
            label: "Contact",
            section: "Navigate",
            icon: "✉",
            action: () => {
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
            },
        },
        {
            id: "resume",
            label: "Resume",
            section: "Links",
            icon: "↗",
            action: () => {
                window.open(RESUME_URL, "_blank", "noopener,noreferrer");
            },
        },
        {
            id: "github",
            label: "GitHub",
            section: "Links",
            icon: "↗",
            action: () => {
                window.open("https://github.com/AdityaH1305", "_blank", "noopener,noreferrer");
            },
        },
        {
            id: "stress-test",
            label: "Initialize System Stress Test (Game)",
            section: "System",
            icon: "▶",
            action: onOpenGame,
        },
        {
            id: "space-invaders",
            label: "Space Invaders",
            section: "Easter Egg",
            icon: "🚀",
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

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Global shortcut: Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setQuery("");
            setSelectedIndex(0);
            // Small delay to let animation start
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
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
                    className="fixed inset-0 z-[9998] flex items-start justify-center pt-[20vh] bg-black/60"
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
                        className="w-full max-w-[520px] mx-4 rounded-xl border border-violet-500/15 bg-[#0a0812]/95 shadow-2xl shadow-violet-500/5 overflow-hidden backdrop-blur-xl"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={handleKeyDown}
                    >
                        {/* Search input */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-violet-500/10">
                            <svg
                                className="w-4 h-4 text-violet-400/50 shrink-0"
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
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Type a command…"
                                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-500 border border-violet-500/20 rounded bg-black/50">
                                ESC
                            </kbd>
                        </div>

                        {/* Results */}
                        <div className="max-h-[320px] overflow-y-auto py-2">
                            {filtered.length === 0 && (
                                <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                    No results found.
                                </p>
                            )}

                            {grouped.map((group) => (
                                <div key={group.section}>
                                    <p className="px-4 pt-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-slate-600">
                                        {group.section}
                                    </p>
                                    {group.items.map((cmd) => (
                                        <button
                                            key={cmd.id}
                                            onClick={() => runCommand(cmd)}
                                            onMouseEnter={() => setSelectedIndex(cmd.globalIndex)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors duration-100 ${
                                                cmd.globalIndex === selectedIndex
                                                    ? "bg-violet-500/10 text-white"
                                                    : "text-slate-300 hover:bg-violet-500/5"
                                            }`}
                                        >
                                            <span className="w-5 text-center text-xs text-violet-400/60">
                                                {cmd.icon}
                                            </span>
                                            <span className="flex-1">{cmd.label}</span>
                                            {cmd.globalIndex === selectedIndex && (
                                                <span className="text-[10px] text-slate-600 font-mono">
                                                    ↵
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Footer hint */}
                        <div className="flex items-center justify-between px-4 py-2 border-t border-violet-500/10 text-[10px] font-mono text-slate-600">
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
