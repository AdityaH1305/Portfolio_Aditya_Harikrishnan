"use client";

import { Component, type ReactNode } from "react";

/* ══════════════════════════════════════════════════════
   CanvasBoundary

   Everything this wraps is ORNAMENT — the atlas, the letter,
   the cube word, the orbit field. None of it carries
   information the reader needs, and all of it is mounted at
   layout or page level, which is the problem: before this
   existed, a throw inside any one of them unmounted the
   whole React tree and the visitor got a blank page instead
   of a portfolio.

   ── IT RENDERS `null`, NEVER A FALLBACK ──
   That is the entire design. A fallback UI would be a
   visible admission of a failure the reader cannot act on,
   in a space that is decorative by definition. Caught, the
   ornament simply is not there, the page reads exactly as it
   does on a machine that never loaded it, and the error goes
   to the console for whoever is looking.

   This is why it must not wrap anything load-bearing.
   `SkillOrbit`'s canvas qualifies; `SkillOrbit`'s DOM list
   does NOT — that list is the accessible interface and the
   server-rendered content, and swallowing it would delete 27
   skills from the page. Wrap the canvas, never the children.

   ── A class component, and it has to be ──
   `getDerivedStateFromError` has no hook equivalent. React
   still has no way to catch a render error from a function
   component.
   ══════════════════════════════════════════════════════ */

interface Props {
    children: ReactNode;
    /** Named in the console line, so a caught throw says which ornament died. */
    label: string;
}

export default class CanvasBoundary extends Component<Props, { dead: boolean }> {
    state = { dead: false };

    static getDerivedStateFromError() {
        return { dead: true };
    }

    componentDidCatch(error: Error) {
        /* Not swallowed silently. The reader loses nothing, but this is a real
           bug and the console is where it belongs — the same reasoning
           SpaceInvadersGame's own per-frame catch already uses. */
        // eslint-disable-next-line no-console
        console.error(`[${this.props.label}] ornament failed:`, error);
    }

    render() {
        return this.state.dead ? null : this.props.children;
    }
}
