"use client";

import { useEffect } from "react";

/* ══════════════════════════════════════════════════════
   Global error — the last resort

   This replaces the ROOT LAYOUT, which means it renders its
   own <html> and <body> and inherits nothing: no
   next/font variables, no globals.css tokens, no
   ScrollProvider, no Cursor. app/not-found.tsx's header
   makes the same point about `global-not-found` and chose
   the nested variant for exactly this reason.

   Here there is no choice — it only renders when the layout
   itself threw, and app/error.tsx cannot catch that.

   ── EVERY STYLE IS INLINE, AND THAT IS THE POINT ──
   The layout failing is the case this exists for, so a
   stylesheet imported by the layout is precisely the thing
   that may not have arrived. Importing globals.css here
   would look tidier and would be a bet on the same
   machinery that just failed. The four hex values below are
   copied from --surface-0 / --text-primary / --text-secondary
   / --accent-text and are the fifth copy of the palette in
   the tree — accepted deliberately, because the alternative
   is a page that cannot render.

   The font stack is system-only for the same reason: the
   webfonts are loaded by the layout.
   ══════════════════════════════════════════════════════ */

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.error("Global error:", error.digest ?? "", error);
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2rem",
                    background: "#1B262C",
                    color: "#BBE1FA",
                    fontFamily:
                        "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
                    WebkitFontSmoothing: "antialiased",
                }}
            >
                <div style={{ maxWidth: "34rem" }}>
                    <p
                        style={{
                            margin: 0,
                            fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: "12px",
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "#839BAA",
                        }}
                    >
                        Error
                    </p>

                    <h1
                        style={{
                            margin: "0.75rem 0 0",
                            fontSize: "clamp(1.75rem, 5vw, 3rem)",
                            fontWeight: 400,
                            lineHeight: 1.12,
                            letterSpacing: "-0.015em",
                        }}
                    >
                        The site failed to start.
                    </h1>

                    <p
                        style={{
                            margin: "1.25rem 0 0",
                            fontSize: "18.5px",
                            fontWeight: 200,
                            lineHeight: 1.6,
                            color: "#98B8CD",
                        }}
                    >
                        This one is on me, not on your browser or your
                        connection. A reload is worth trying; if it keeps
                        happening, the write-ups are still reachable directly.
                    </p>

                    <div
                        style={{
                            marginTop: "2rem",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.75rem",
                        }}
                    >
                        <button
                            type="button"
                            onClick={reset}
                            style={{
                                appearance: "none",
                                cursor: "pointer",
                                font: "inherit",
                                fontSize: "14px",
                                padding: "0.7rem 1.4rem",
                                borderRadius: "999px",
                                border: "1px solid #5C9ECA",
                                background: "#BBE1FA",
                                color: "#1B262C",
                            }}
                        >
                            Reload
                        </button>
                        {/* A PLAIN ANCHOR, NOT next/link, and the lint rule
                            below is disabled deliberately rather than worked
                            around. This screen renders when the root layout
                            threw — the client router is part of what may have
                            failed, and `<Link>` would attempt a client-side
                            navigation through it. A bare href forces a full
                            document load, which is the only thing here that is
                            guaranteed to work. */}
                        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                        <a
                            href="/"
                            style={{
                                font: "inherit",
                                fontSize: "14px",
                                padding: "0.7rem 1.4rem",
                                borderRadius: "999px",
                                border: "1px solid rgba(187,225,250,0.22)",
                                color: "#BBE1FA",
                                textDecoration: "none",
                            }}
                        >
                            Home
                        </a>
                    </div>

                    {error.digest && (
                        <p
                            style={{
                                marginTop: "1.5rem",
                                fontFamily:
                                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                                fontSize: "12px",
                                color: "#586D7A",
                            }}
                        >
                            Reference {error.digest}
                        </p>
                    )}
                </div>
            </body>
        </html>
    );
}
