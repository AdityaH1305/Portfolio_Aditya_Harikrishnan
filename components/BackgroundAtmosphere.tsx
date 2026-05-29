"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * BackgroundAtmosphere
 *
 * Fixed-position layered overlays that add depth to the dark background:
 * 1. SVG noise texture (opacity ~0.03)
 * 2. Technical grid (1px lines, ultra-low opacity)
 * 3. Cinematic vignette (soft edge darkening)
 * 4. Localized cyan radial tints (3 subtle atmospherics)
 *
 * Enhanced with:
 * - Ultra-subtle parallax depth (max ±30px total travel)
 * - Scroll-responsive glow opacity (±0.01 shifts per section)
 *
 * All layers are pointer-events:none and purely decorative.
 * Zero impact on interactivity, layout, or performance.
 */
export default function BackgroundAtmosphere() {
    const noiseRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const heroGlowRef = useRef<HTMLDivElement>(null);
    const midGlowRef = useRef<HTMLDivElement>(null);
    const lowerGlowRef = useRef<HTMLDivElement>(null);

    const scrollCurrent = useRef(0);
    const scrollTarget = useRef(0);
    const rafId = useRef<number>(0);

    const animate = useCallback(() => {
        // Smooth lerp toward target scroll
        scrollCurrent.current += (scrollTarget.current - scrollCurrent.current) * 0.04;
        const s = scrollCurrent.current;

        // ── Parallax offsets (extremely subtle) ──
        // Max travel: ±30px across full page scroll
        if (noiseRef.current) {
            noiseRef.current.style.transform = `translateY(${s * -8}px)`;
        }
        if (gridRef.current) {
            gridRef.current.style.transform = `translateY(${s * -14}px)`;
        }
        if (heroGlowRef.current) {
            heroGlowRef.current.style.transform = `translateX(-50%) translateY(${s * -20}px)`;
        }
        if (midGlowRef.current) {
            midGlowRef.current.style.transform = `translateY(${s * -25}px)`;
        }
        if (lowerGlowRef.current) {
            lowerGlowRef.current.style.transform = `translateY(${s * -30}px)`;
        }

        // ── Scroll-responsive glow opacity (±0.01 range) ──
        // Compute normalized scroll position
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollNorm = docHeight > 0 ? scrollTarget.current / docHeight : 0;

        if (heroGlowRef.current) {
            // Hero glow fades as we scroll past (0.04 → 0.025)
            const heroOpacity = 0.04 - scrollNorm * 0.015;
            heroGlowRef.current.style.opacity = Math.max(0.02, heroOpacity).toFixed(4);
        }
        if (midGlowRef.current) {
            // Mid glow peaks around orb section (scrollNorm ~0.4–0.55)
            const orbDistance = Math.abs(scrollNorm - 0.47);
            const midBoost = Math.max(0, 1 - orbDistance * 4) * 0.012;
            midGlowRef.current.style.opacity = (0.03 + midBoost).toFixed(4);
        }
        if (lowerGlowRef.current) {
            // Lower glow peaks near featured project (scrollNorm ~0.55–0.70)
            const fpDistance = Math.abs(scrollNorm - 0.62);
            const lowerBoost = Math.max(0, 1 - fpDistance * 4) * 0.01;
            lowerGlowRef.current.style.opacity = (0.035 + lowerBoost).toFixed(4);
        }

        rafId.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        const onScroll = () => {
            scrollTarget.current = window.scrollY;
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        rafId.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(rafId.current);
        };
    }, [animate]);

    return (
        <div className="atmosphere-root" aria-hidden="true">
            {/* Layer 1: SVG Noise texture */}
            <div ref={noiseRef} className="atmosphere-noise atmosphere-parallax" />

            {/* Layer 2: Technical grid */}
            <div ref={gridRef} className="atmosphere-grid atmosphere-parallax" />

            {/* Layer 3: Cinematic vignette */}
            <div className="atmosphere-vignette" />

            {/* Layer 4: Localized cyan radials */}
            <div ref={heroGlowRef} className="atmosphere-glow atmosphere-glow--hero atmosphere-parallax" />
            <div ref={midGlowRef} className="atmosphere-glow atmosphere-glow--mid atmosphere-parallax" />
            <div ref={lowerGlowRef} className="atmosphere-glow atmosphere-glow--lower atmosphere-parallax" />
        </div>
    );
}
