"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/motion";
import CaseStudyStage, {
    ACT_OVERLAP,
    buildAct,
    REST,
    slideForBeat,
} from "@/components/CaseStudyStage";
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

            /* `top bottom` — the moment the zone's top edge enters the
               viewport, a full 100vh of lead.

               THIS EDGE IS SHARED WITH `ZoneTint`, and that is the whole
               reason for the number. The room's ground darkening is
               scroll-linked across exactly `top bottom` → `top top`; these
               class-driven chrome fades (nav, grid, atlas, vignette, bars)
               are time-linked at 1200ms. Starting them on the same pixel
               makes the two read as one event — the ground and the chrome
               recede together. It was `top 85%`, roughly 15vh of lead, which
               would have let the ground reach ~85% of its depth before the
               chrome so much as began: two separate events a beat apart.

               They stay differently governed on purpose. Scrubbing the other
               four would mean scroll-linking properties that are pure CSS
               today, for no gain — at any plausible scroll rate 100vh takes
               roughly 1.2–2s, so a 1200ms fade lands within a beat of the
               ramp either way.

               `end` stays at the true boundary: that is where the sticky
               travel actually ends, and it already coincides with the start
               of ZoneTint's ramp-out, so the exit is symmetric for free.

               Only THIS trigger moves. The choreography timeline's trigger
               must stay top-top/bottom-bottom because that range IS the
               sticky range — they are separate triggers precisely so this
               one can be tuned without touching that. */
            const boundary = ScrollTrigger.create({
                trigger: root,
                start: "top bottom",
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
                   called on an actual change.

                   ── ONE CLIP PER SLIDE, not one per act ──
                   This used to be `act.querySelector("[data-act-video]")`,
                   which returns the FIRST match. Ludex has two video slides,
                   so only the dashboard clip was ever registered: it played
                   through all three of its rest windows while the sign-in
                   slide sat on top of it, its own video never started and its
                   poster never lifted. Nothing errored — the wrong video was
                   simply playing underneath the right still.

                   So every slide gets its own entry, and a clip may play only
                   when it is the slide the current beat is showing. */
                const clips = acts.flatMap((act, actIndex) => {
                    const slides = gsap.utils.toArray<HTMLElement>(
                        "[data-act-slide]",
                        act,
                    );
                    return slides
                        .map((slide, slideIndex) => ({
                            act: actIndex,
                            slideIndex,
                            slideCount: slides.length,
                            video: slide.querySelector<HTMLVideoElement>(
                                "[data-act-video]",
                            ),
                            poster: slide.querySelector<HTMLElement>(
                                "[data-act-poster]",
                            ),
                            playing: false,
                        }))
                        .filter((c) => c.video && c.poster);
                });

                const syncClips = (time: number) => {
                    for (const c of clips) {
                        const local = time - c.act;
                        /* Which rest window we are in, or -1 while the
                           composition is mid-transition. */
                        const beat = REST.findIndex(
                            ([a, b]) => local >= a && local <= b,
                        );
                        const resting =
                            local >= 0 &&
                            local <= 1 &&
                            beat !== -1 &&
                            slideForBeat(beat, c.slideCount) === c.slideIndex;

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

                /* ── Per-act layer promotion ──────────────────────────
                   `globals.css` used to promote every act's `will-change:
                   transform, opacity` for the acts, heads, media panels,
                   beats and CTAs unconditionally under `zone-immersive` —
                   21 composited layers created in one frame the instant the
                   reader crossed into the zone, most of them for acts that
                   were `visibility: hidden` and would stay that way for
                   thousands of pixels of scroll.

                   `zone-act-promoted` (a class on `.zone-act` itself; the
                   CSS cascades `will-change` down to its known descendants —
                   see the `.zone-act-promoted` rule) is instead driven by
                   the same `tl.time()` this already reads for video sync, so
                   only the act(s) actually in play carry the promotion. An
                   act is in play from `ACT_OVERLAP` before its own boundary
                   — the point its entry tween starts, matching `entryAt` in
                   `buildAct` — through the end of its own span, so both
                   sides of a crossfade stay promoted for its duration and
                   nothing else does. */
                const syncPromotion = (time: number) => {
                    acts.forEach((act, i) => {
                        const lower = i === 0 ? 0 : i - ACT_OVERLAP;
                        const upper = i + 1;
                        act.classList.toggle(
                            "zone-act-promoted",
                            time >= lower - 0.001 && time <= upper + 0.001,
                        );
                    });
                };

                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: root,
                        start: "top top",
                        end: "bottom bottom",
                        /* A NUMBER, not `true`. `scrub: true` locks the
                           timeline to the scroll position 1:1, which is what
                           made the relocations feel mechanical however wide
                           their windows got — every wheel delta landed on the
                           composition instantly and undamped. One second of
                           catch-up gives the panel the same trailing weight
                           Lenis gives the page.

                           LivingArchitecture deliberately does NOT do this,
                           and its comment explains why: the atlas engine
                           already lerps its own targets, so smoothing there
                           would be a third stage and read as lag. This
                           timeline has no second stage — here it is the
                           second, not the third. */
                        scrub: 1,
                        /* Slot offsets are fractions of the measured slots
                           box, resolved through function-based values. Without
                           this they would stay baked at the width the page
                           first loaded at. */
                        invalidateOnRefresh: true,
                    },
                });

                /* Attached after construction, not passed in the vars object:
                   a callback in the literal would close over `tl` before its
                   own initialiser completes, which is a temporal-dead-zone
                   throw the moment GSAP calls it early.

                   On the TIMELINE, not the trigger. With a numeric scrub the
                   trigger's progress runs ahead of the timeline, so
                   `self.progress` is no longer what is on screen and the video
                   would start playing while the panel was still travelling.
                   `tl.time()` IS the rendered state, and with one unit per act
                   it already reads as actIndex + localProgress. */
                tl.eventCallback("onUpdate", () => {
                    const time = tl.time();
                    syncClips(time);
                    syncPromotion(time);
                });

                acts.forEach((act, i) => buildAct(tl, act, i, 1));

                /* `onUpdate` only fires once the playhead actually moves;
                   without this, an act loaded already inside the zone (a
                   restored scroll position, a deep link) would sit
                   unpromoted until the next scroll frame. */
                syncPromotion(tl.time());

                return () => {
                    /* Leaving a video playing behind a torn-down timeline is
                       exactly the kind of non-idempotent leftover that makes
                       scrolling back up look broken. Same reasoning for a
                       promoted layer surviving the teardown. */
                    clips.forEach((c) => c.video!.pause());
                    acts.forEach((act) =>
                        act.classList.remove("zone-act-promoted"),
                    );
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
            {/* The violet field is gone. The room is now a shift in VALUE,
                not in hue: the surfaces deepen and the vignette tightens.
                A second accent would have broken the one-accent lock, and a
                glowing field was the last of the seven light layers. */}

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
