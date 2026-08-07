/* ══════════════════════════════════════════════════════
   Background Atmosphere

   Static, server-rendered. No JS, no rAF, no refs.

   This previously ran an animation loop applying parallax
   as `scrollY * -8` through `scrollY * -30` — raw scroll
   pixels, not a normalized 0–1 value. Every layer was
   translated off-screen within ~50px of scrolling, so the
   loop spent the rest of the page animating elements no
   one could see. The layers are fixed-position ambience;
   they read correctly without motion, so the loop is gone.

   LivingArchitecture is the one animated ambient system.
   ══════════════════════════════════════════════════════ */

export default function BackgroundAtmosphere() {
    return (
        <div className="atmosphere-root" aria-hidden="true">
            <div className="atmosphere-noise" />
            <div className="atmosphere-grid" />
            <div className="atmosphere-glow atmosphere-glow--hero" />
            <div className="atmosphere-glow atmosphere-glow--mid" />
            <div className="atmosphere-glow atmosphere-glow--lower" />
            <div className="atmosphere-vignette" />
        </div>
    );
}
