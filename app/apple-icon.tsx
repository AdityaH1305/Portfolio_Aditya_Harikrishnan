import { ImageResponse } from "next/og";
import { ICE, SURFACE_0 } from "@/lib/site";

/* ══════════════════════════════════════════════════════
   Apple touch icon — 180x180

   Same mark as app/icon.tsx, drawn for the size iOS actually
   asks for. Without this, adding the site to a home screen
   gets a screenshot of the page, which at that moment is the
   signal gate: a near-black rectangle with a scattering of
   blue blocks and no name on it.

   ── It carries the hairline box; the 32px icon does not ──
   Logo.tsx's mark is type inside a hairline, and at 180px
   that reads exactly as it does on the site. At 32 it closes
   up into a filled square, which is why the favicon drops it.

   iOS composites this onto its own rounded rectangle and does
   NOT respect transparency, so the ground is painted
   explicitly — a transparent icon comes out black there.
   ══════════════════════════════════════════════════════ */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: SURFACE_0,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 132,
                        height: 132,
                        borderRadius: 30,
                        /* `--border-strong`, resolved: rgb(187 225 250 / 0.22)
                           over --surface-0. ImageResponse has no custom
                           properties, so this is the one place the value is
                           written out. */
                        border: "2px solid #3B4F5C",
                        color: ICE,
                        fontSize: 62,
                        fontWeight: 500,
                        letterSpacing: -2,
                        fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                >
                    AH
                </div>
            </div>
        ),
        size,
    );
}
