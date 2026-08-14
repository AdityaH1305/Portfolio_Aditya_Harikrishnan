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

   ── The three accent glows are gone ──
   Grid, noise and vignette are texture: they describe a
   surface. The three radial washes were light, and between
   them, the Ludex glow and the zone field the page had seven
   layers all softening edges the same way, which is half of
   what made the design read as generated. Nothing on the
   page emits light now. That is what leaves the atlas and
   the SkillOrbit field as the only things that do.
   ══════════════════════════════════════════════════════ */

export default function BackgroundAtmosphere() {
    return (
        <div className="atmosphere-root" aria-hidden="true">
            <div className="atmosphere-noise" />
            <div className="atmosphere-grid" />
            <div className="atmosphere-vignette" />
        </div>
    );
}
