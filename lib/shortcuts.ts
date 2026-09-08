/* ══════════════════════════════════════════════════════
   The keyboard shortcuts, written down

   ── THIS IS DOCUMENTATION, NOT A SOURCE OF TRUTH ──
   Say it plainly, because the shape invites the opposite
   assumption: editing this list REBINDS NOTHING. The actual
   handlers live in nine separate components — CommandPalette,
   Lightbox, VideoPlayer, SpaceInvadersGame, FigureGallery,
   SiteCommands — each binding its own keys where it can see
   the state they act on. Centralising the bindings would mean
   a registry that every one of them subscribes to, which is
   a lot of machinery to describe eleven keys.

   So this is a hand-maintained list and it can drift. What
   stops it drifting far is that it is the only place a reader
   ever sees these keys, so a wrong entry is a visible bug
   rather than a silent one.

   If you add or change a binding, change it here too.
   ══════════════════════════════════════════════════════ */

export interface Shortcut {
    /** Rendered as separate keycaps, in order. */
    keys: string[];
    label: string;
    /** When it applies. Empty for site-wide. */
    scope?: string;
}

export const SHORTCUTS: readonly Shortcut[] = [
    { keys: ["Ctrl", "K"], label: "Open the command palette" },
    { keys: ["?"], label: "Show this list" },
    { keys: ["Esc"], label: "Close whatever is open" },

    {
        keys: ["↑", "↓"],
        label: "Move through results",
        scope: "Command palette",
    },
    { keys: ["Enter"], label: "Run the selected command", scope: "Command palette" },

    { keys: ["←", "→"], label: "Previous / next image", scope: "Lightbox" },

    { keys: ["Space"], label: "Play or pause", scope: "Video" },
    { keys: ["←", "→"], label: "Skip 10 seconds", scope: "Video" },
    { keys: ["F"], label: "Fullscreen", scope: "Video" },

    { keys: ["←", "→"], label: "Move the ship", scope: "Stress test" },
    { keys: ["Space"], label: "Fire, or start a new run", scope: "Stress test" },
];
