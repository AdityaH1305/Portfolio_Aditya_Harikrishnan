"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/motion";
import CaseStudyStage, { buildAct, REST } from "@/components/CaseStudyStage";
import { CASE_STUDIES } from "@/lib/caseStudies";
import { ZONE_EVENT } from "@/lib/zone";

/* ══════════════════════════════════════════════════════
   CaseStudyZone — the immersive region

   Three case studies share ONE sticky 100vh box. Each act is
   absolutely stacked inside it, so "the previous one fades
   out and the next fades in" is a real swap in the same
   space, not a seam between two sections. Inside an act,
   scroll moves the media panel and the text cards between
   slots — see CaseStudyStage for the score.

   ── Sticky, not GSAP pin ──
   Lenis runs in default mode (real window scroll, no wrapper
   transform), so native `position: sticky` works and needs no
   scrollerProxy. That is cheaper than a pin and has no
   pin-spacer to desynchronise on refresh. The previous zone
   already proved it here; this keeps the mechanism and
   changes what happens inside it.

   ── Three independent mechanisms, deliberately separate ──
   1. FRAMING — a boundary trigger toggling `zone-immersive`
      on <html>. Not gated on width or motion: the palette
      deepens and the vignette fades in everywhere. Pure CSS
      state, no per-frame JS.
   2. CHOREOGRAPHY — one scrubbed master timeline. Gated to
      desktop + no-reduced-motion, matching the CSS exactly.
   3. LOAD SHEDDING — the same boundary broadcasts
      `zone:immersive`, and the atlas and the parallax stand
      down while the reader is in here. This is the longest
      region of the page and was the one running the most
      per-frame work.

   ── Why the full case studies left ──
   This used to render `<Showcase brief />` per chapter: prose,
   a seven-row table, a tabbed gallery, a video split. Three to
   four viewport heights each, none of it choreographable. All
   of it still exists, unchanged, at /work/<slug> — which was
   already rendering every bit of it.
   ══════════════════════════════════════════════════════ */

/** Must match the @media block that stages `.zone-*` in globals.css, exactly.
 *  `scripting: enabled` is trivially true wherever this runs, but it has to be
 *  in both strings or the CSS could stage a layout the JS never animates. */
const CHOREOGRAPHED =
    "(min-width: 1024px) and (prefers-reduced-motion: no-preference) and (scripting: enabled)";

export default function CaseStudyZone() {
    const rootRef = useRef<HTMLDivElement>(null);

    registerGsap();

    useGSAP(
        () => {
            const root = rootRef.current;
            if (!root) return;

            const setImmersive = (active: boolean) => {
                document.documentElement.classList.toggle(
                    "zone-immersive",
                    active,
                );
                /* An event rather than lifted state: the two consumers are
                   mounted elsewhere in the tree with no props path to here,
                   which is the same reason SideNav signals Cursor with
                   `cursor:charge`. */
                window.dispatchEvent(
                    new CustomEvent(ZONE_EVENT, { detail: { active } }),
                );
            };

            const boundary = ScrollTrigger.create({
                trigger: root,
                start: "top top",
                end: "bottom bottom",
                onToggle: (self) => setImmersive(self.isActive),
            });

            const mm = gsap.matchMedia();

            mm.add(CHOREOGRAPHED, () => {
                const acts = gsap.utils.toArray<HTMLElement>(
                    "[data-act]",
                    root,
                );
                if (acts.length === 0) return;

                /* One unit of timeline per act, so a position reads as
                   `actIndex + localProgress` and the score in CaseStudyStage
                   maps straight onto it. */
                /* ── Video: poster while travelling, playback at rest ──
                   Decoding a video and compositing a scrubbed transform on the
                   same layer is where the frames go, so the two never overlap.

                   Driven from the master timeline's own progress rather than
                   from separate ScrollTriggers. The scrub range is (scroller −
                   stage height), so a second trigger measured against the
                   scroller would sit a stage-height out of step with the
                   choreography it is supposed to track. Reading the timeline
                   makes that class of drift impossible.

                   Direct DOM writes, not React state: this runs in the scroll
                   path, and `playing` gates it so play()/pause() are only
                   called on an actual change. */
                const clips = acts
                    .map((act, i) => ({
                        act: i,
                        video: act.querySelector<HTMLVideoElement>(
                            "[data-act-video]",
                        ),
                        poster: act.querySelector<HTMLElement>(
                            "[data-act-poster]",
                        ),
                        playing: false,
                    }))
                    .filter((c) => c.video && c.poster);

                const syncClips = (time: number) => {
                    for (const c of clips) {
                        const local = time - c.act;
                        const resting =
                            local >= 0 &&
                            local <= 1 &&
                            REST.some(([a, b]) => local >= a && local <= b);

                        if (resting === c.playing) continue;
                        c.playing = resting;

                        if (resting) {
                            c.poster!.style.opacity = "0";
                            void c.video!.play().catch(() => {
                                /* Autoplay can be refused; the poster stays
                                   up, which is the travelling state anyway. */
                                c.poster!.style.opacity = "1";
                            });
                        } else {
                            c.video!.pause();
                            c.poster!.style.opacity = "1";
                        }
                    }
                };

                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: root,
                        start: "top top",
                        end: "bottom bottom",
                        scrub: true,
                        /* Slot offsets are fractions of the measured slots
                           box, resolved through function-based values. Without
                           this they would stay baked at the width the page
                           first loaded at. */
                        invalidateOnRefresh: true,
                        onUpdate: (self) =>
                            syncClips(self.progress * acts.length),
                    },
                });

                acts.forEach((act, i) => buildAct(tl, act, i, 1));

                return () => {
                    /* Leaving a video playing behind a torn-down timeline is
                       exactly the kind of non-idempotent leftover that makes
                       scrolling back up look broken. */
                    clips.forEach((c) => c.video!.pause());
                    tl.scrollTrigger?.kill();
                    tl.kill();
                };
            });

            return () => {
                boundary.kill();
                mm.revert();
                /* Never strand the site retinted or the atlas paused — a route
                   change from inside the zone would otherwise leave both. */
                setImmersive(false);
            };
        },
        { scope: rootRef },
    );

    return (
        <div ref={rootRef}>
            {/* Cinematic framing. Fixed, inert, always mounted; only their
                opacity changes, driven by the `zone-immersive` class. */}
            <div className="zone-vignette" aria-hidden="true" />
            <div className="zone-bar zone-bar--top" aria-hidden="true" />
            <div className="zone-bar zone-bar--bottom" aria-hidden="true" />

            <div
                className="zone-scroll"
                style={
                    {
                        /* Drives the scroller's height in CSS, so the act count
                           lives in one place instead of being written into a
                           calc() that nobody updates. */
                        "--zone-acts": String(CASE_STUDIES.length),
                    } as React.CSSProperties
                }
            >
                <div className="zone-stage">
                    {CASE_STUDIES.map((study, i) => (
                        <CaseStudyStage
                            key={study.slug}
                            study={study}
                            index={i}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
