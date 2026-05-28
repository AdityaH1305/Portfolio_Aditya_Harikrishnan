"use client";

/**
 * BackgroundAtmosphere
 * 
 * Fixed-position layered overlays that add depth to the dark background:
 * 1. SVG noise texture (opacity ~0.03)
 * 2. Technical grid (1px lines, ultra-low opacity)
 * 3. Cinematic vignette (soft edge darkening)
 * 4. Localized cyan radial tints (3 subtle atmospherics)
 * 
 * All layers are pointer-events:none and purely decorative.
 * Zero impact on interactivity, layout, or performance.
 */
export default function BackgroundAtmosphere() {
    return (
        <div className="atmosphere-root" aria-hidden="true">
            {/* Layer 1: SVG Noise texture */}
            <div className="atmosphere-noise" />

            {/* Layer 2: Technical grid */}
            <div className="atmosphere-grid" />

            {/* Layer 3: Cinematic vignette */}
            <div className="atmosphere-vignette" />

            {/* Layer 4: Localized cyan radials */}
            <div className="atmosphere-glow atmosphere-glow--hero" />
            <div className="atmosphere-glow atmosphere-glow--mid" />
            <div className="atmosphere-glow atmosphere-glow--lower" />
        </div>
    );
}
