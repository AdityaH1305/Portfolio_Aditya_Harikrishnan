"use client";

import { useEffect } from "react";
import Link from "next/link";

/* ══════════════════════════════════════════════════════
   Route-level error

   Renders INSIDE app/layout.tsx, so it keeps the fonts, the
   palette, the cursor and the scroll provider — the same
   reason app/not-found.tsx is a plain `not-found` rather
   than a `global-not-found`, and the comment there makes the
   argument in full.

   That inheritance is the whole point: a reader who hits
   this should feel like they are still on the site, because
   they are. Only app/global-error.tsx, which replaces the
   document, cannot do that.

   ── The copy is deliberately not "Something went wrong" ──
   The rest of this site writes in sentences and admits what
   it does not know. A page that fails should not suddenly
   sound like a dialog box.
   ══════════════════════════════════════════════════════ */

export default function RouteError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        /* The digest is the only handle on a production stack trace, which is
           stripped from the client bundle. Without printing it, a report of
           this screen is unactionable. */
        // eslint-disable-next-line no-console
        console.error("Route error:", error.digest ?? "", error);
    }, [error]);

    return (
        <main className="not-found-stage">
            <div className="not-found-copy">
                <p className="label-muted">Error</p>
                <h1 className="heading-xl mt-3">
                    Something on this page broke.
                </h1>
                <p className="body-lg mt-5">
                    Not your doing, and not the link. Reloading this section
                    usually clears it; if it does not, the rest of the site is
                    unaffected.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={reset}
                        className="btn-primary"
                    >
                        Try this page again
                    </button>
                    <Link href="/" className="btn-secondary">
                        Back to the portfolio
                    </Link>
                </div>

                {error.digest && (
                    <p className="mono text-xs text-quaternary mt-6">
                        Reference {error.digest}
                    </p>
                )}
            </div>
        </main>
    );
}
