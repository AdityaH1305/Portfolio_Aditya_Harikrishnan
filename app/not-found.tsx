import type { Metadata } from "next";
import Link from "next/link";
import NotFoundCubes from "@/components/NotFound/NotFoundCubes";

/* ══════════════════════════════════════════════════════
   404

   Thirty cubes fly in from beyond the frame, assemble into `404`, and the
   word drifts across the viewport reflecting off the walls. `digits.ts` holds
   every decision and is unit-tested; `NotFoundCubes.tsx` owns the canvas.

   ── A SERVER component, deliberately ──
   A `"use client"` file cannot export `metadata` at all, and this route needs
   its own (see below). `NotFoundCubes` is imported directly rather than
   through `dynamic({ ssr: false })` — a server component cannot call that,
   and matching the `FeaturedWork.tsx` pattern would mean a fourth file whose
   only job is to hold one `dynamic()` call. It would buy nothing: GSAP is
   already in the layout chunk via `ScrollProvider` and `Cursor`, and this
   component's entire SSR footprint is one empty `<canvas>`.

   ── Not `app/global-not-found.tsx` ──
   Next 16 has it, and it is wrong here: it renders its own `<html>`/`<body>`
   OUTSIDE the root layout, so the page would lose the fonts, the palette,
   `ScrollProvider` and `Cursor`. Plain `app/not-found.tsx` renders inside
   `app/layout.tsx`, which is what this wants.

   ── The heading is real text and the canvas does not stand in for it ──
   This is the one structural difference from `ZoneTitle`, and it is forced.
   `ZoneTitle` can make its `<h2>` `color: transparent` because its canvas
   draws the word inside the heading's own measured box. This word MOVES, so
   it can never stand in for positioned type. The cube `404` is therefore
   pure ornament that echoes a heading rather than replacing one — which
   makes the accessibility story trivially correct: the canvas is
   `aria-hidden`, `@media (scripting: none)` removes it, and a reader without
   JavaScript or with a screen reader loses nothing but decoration.
   ══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
    title: "404 — Aditya Harikrishnan",
    description: "That page does not exist.",

    /* NOT INHERITED, and this is the line that matters. The root layout sets
       `alternates: { canonical: "/" }`, and Next resolves `alternates`
       per-route rather than replacing it wholesale the way it does
       `openGraph` — so without this, every missing URL on the site would
       advertise itself to crawlers as the home page.

       `openGraph` IS left inherited, on purpose: the route is noindex and 404
       URLs do not get shared, so restating it would be four lines defending
       nothing. */
    alternates: { canonical: null },
    robots: { index: false, follow: false },
};

export default function NotFound() {
    return (
        <main className="not-found-stage">
            <NotFoundCubes />

            <div className="not-found-copy">
                <p className="label-muted">Error 404</p>
                <h1 className="heading-xl mt-3">This page does not exist.</h1>
                <p className="body-lg mt-5">
                    The link may be out of date, or the address mistyped.
                    Everything that does exist is one step away.
                </p>
                <Link href="/" className="btn-primary mt-8">
                    Back to the portfolio
                </Link>
            </div>
        </main>
    );
}
