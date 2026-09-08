import { ImageResponse } from "next/og";
import { ICE, SURFACE_0 } from "@/lib/site";

/* ══════════════════════════════════════════════════════
   Favicon — the AH monogram

   Generated at BUILD TIME by ImageResponse, so this adds no
   binary asset to the repo and no SVG (there are none, and
   components/Logo.tsx records why the mark is built from
   type rather than artwork).

   The site had exactly one icon before this — app/favicon.ico
   — which covers the browser tab and nothing else: no
   home-screen icon, no install tile, no high-DPI tab.

   ── The mark is the same one Logo.tsx draws ──
   "AH" in a mono face, on the page's own ground. Not the
   letter A from the entrance: that glyph is three-dimensional
   and reads as noise at 32px.

   ── A SYSTEM MONO STACK, and it has to be ──
   ImageResponse cannot use next/font, and `public/` holds no
   font file to hand it, so the site's JetBrains Mono is not
   reachable here. A generic mono is the honest fallback —
   and at 32 pixels the difference between two mono faces is
   not something anyone can see.
   ══════════════════════════════════════════════════════ */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
                    color: ICE,
                    /* 15px, not larger: "AH" is two characters and the tab
                       favicon is 16px on most displays. Anything bigger and
                       the pair touches the edges and turns into a smudge. */
                    fontSize: 15,
                    fontWeight: 500,
                    letterSpacing: -0.5,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
            >
                AH
            </div>
        ),
        size,
    );
}
