"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import CommandPalette from "@/components/CommandPalette";
import { GAME_OPEN_EVENT } from "@/lib/zone";

/* ══════════════════════════════════════════════════════
   SiteCommands

   One owner for the command palette and the thing it can
   launch, mounted once in app/layout.tsx.

   ── WHY THIS EXISTS AT ALL ──
   The palette lived in app/page.tsx, which meant Ctrl+K —
   the site's primary navigation affordance, advertised by a
   keycap under the nav rail and by a line in the footer —
   did NOTHING on all three /work/* routes and on the 404.
   Those are exactly the pages a shared link lands on.

   Moving it up here fixes all five pages at once and costs
   nothing: the palette renders null until it is opened.

   ── LAYOUT, NOT TEMPLATE ──
   app/template.tsx remounts on every navigation. This holds
   `showGame`, and a game dismissed by navigating would be a
   surprising way to lose it; more importantly the palette's
   own open/close state would reset mid-transition. Nothing
   here rescans the DOM per route, which is the one reason
   LiveRings and DeviceTierFlag are in the template instead.
   app/layout.tsx:194-197 makes the same argument for Cursor.

   ── The game stays lazy ──
   `ssr: false` with `loading: () => null`, exactly as
   app/page.tsx had it. It is a few hundred lines of canvas
   game that almost nobody opens, and now that this component
   is in the layout it would otherwise be in the layout's
   chunk on every route.
   ══════════════════════════════════════════════════════ */

const SpaceInvadersModal = dynamic(
    () => import("@/components/SpaceInvadersModal"),
    { ssr: false, loading: () => null },
);

/* Lazy for the same reason as the game: a help screen nobody has asked for
   should not be in the layout chunk of every route. */
const ShortcutsSheet = dynamic(() => import("@/components/ShortcutsSheet"), {
    ssr: false,
    loading: () => null,
});

export default function SiteCommands() {
    const [showGame, setShowGame] = useState(false);
    const [showKeys, setShowKeys] = useState(false);

    const openGame = useCallback(() => setShowGame(true), []);
    const closeGame = useCallback(() => setShowGame(false), []);
    const openKeys = useCallback(() => setShowKeys(true), []);
    const closeKeys = useCallback(() => setShowKeys(false), []);

    /* SideNav's five-click easter egg is mounted by the PAGE, below this
       component, so there is no prop path to it any more. See
       GAME_OPEN_EVENT in lib/zone.ts. */
    useEffect(() => {
        const open = () => setShowGame(true);
        window.addEventListener(GAME_OPEN_EVENT, open);
        return () => window.removeEventListener(GAME_OPEN_EVENT, open);
    }, []);

    /* ── `?` opens the shortcut list ──
       Free: `Ctrl/Cmd K` is the only other site-wide binding. Two guards, both
       necessary. `?` is Shift+/, so it fires while TYPING — bail on any field.
       And it must not stack on top of another dialog, which would put two
       focus traps on the page fighting over Tab. */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;

            const t = e.target as HTMLElement | null;
            if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
            if (document.querySelector('[role="dialog"]')) return;

            e.preventDefault();
            setShowKeys(true);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <>
            <CommandPalette
                onOpenGame={openGame}
                onOpenShortcuts={openKeys}
            />
            {showGame && <SpaceInvadersModal onClose={closeGame} />}
            {showKeys && <ShortcutsSheet onClose={closeKeys} />}
        </>
    );
}
