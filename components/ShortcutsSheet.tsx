"use client";

import { useEffect, useRef } from "react";
import { SHORTCUTS } from "@/lib/shortcuts";
import useFocusTrap from "@/hooks/useFocusTrap";
import { lockScroll, unlockScroll } from "@/lib/lenis";

/* ══════════════════════════════════════════════════════
   ShortcutsSheet

   What `?` opens. Nothing on the site advertised its own
   keyboard surface except one `Ctrl K` keycap under the nav
   rail, and there are eleven bindings.

   ── It reuses everything ──
   `.keycap` is the palette's own key styling, `--surface-2`
   is the palette's ground, and the focus trap is the one
   hooks/useFocusTrap.ts provides. No new visual language.

   ── `lockScroll`, reference-counted ──
   lib/lenis.ts counts locks precisely because overlays open
   over each other; this can be opened from the palette,
   which is unlocking as it closes.
   ══════════════════════════════════════════════════════ */

export default function ShortcutsSheet({ onClose }: { onClose: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useFocusTrap(ref, true);

    useEffect(() => {
        lockScroll();
        return unlockScroll;
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    /* Grouped by scope, in first-appearance order — same rule the palette uses
       for its sections, so the two read alike. */
    const groups: { scope: string; items: typeof SHORTCUTS }[] = [];
    for (const s of SHORTCUTS) {
        const scope = s.scope ?? "Anywhere";
        const found = groups.find((g) => g.scope === scope);
        if (found) (found.items as Shortcut[]).push(s);
        else groups.push({ scope, items: [s] as unknown as typeof SHORTCUTS });
    }

    return (
        <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-[9998] flex items-start justify-center pt-[16vh] px-4
                       bg-black/60 backdrop-blur-sm"
        >
            <div
                className="w-full max-w-lg rounded-2xl border border-edge-strong bg-surface-1
                           shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-edge-default">
                    <p className="label">Keyboard</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mono text-xs text-tertiary hover:text-accent transition-colors duration-200"
                    >
                        Close
                    </button>
                </div>

                <div
                    className="max-h-[60vh] overflow-y-auto px-5 py-4"
                    data-lenis-prevent
                >
                    {groups.map((g) => (
                        <div key={g.scope} className="mb-5 last:mb-0">
                            <p className="label-muted">{g.scope}</p>
                            <ul className="mt-2">
                                {g.items.map((s) => (
                                    <li
                                        key={`${g.scope}-${s.keys.join()}-${s.label}`}
                                        className="flex items-center justify-between gap-6 py-1.5"
                                    >
                                        <span className="body-sm text-secondary">
                                            {s.label}
                                        </span>
                                        <span className="flex items-center gap-1 shrink-0">
                                            {s.keys.map((k) => (
                                                <kbd key={k} className="keycap">
                                                    {k}
                                                </kbd>
                                            ))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

type Shortcut = (typeof SHORTCUTS)[number];
