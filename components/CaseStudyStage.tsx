"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import CtaRow from "@/components/CtaRow";
import VideoPlayer from "@/components/VideoPlayer";
import Lightbox, { type LightboxImage } from "@/components/Lightbox";
import { gsap, EASE } from "@/lib/motion";
import type { CaseStudy } from "@/lib/caseStudies";

/* ══════════════════════════════════════════════════════
   CaseStudyStage — one act of the choreographed zone

   Three of these are stacked in the same sticky 100vh box
   (see CaseStudyZone). An act is a fixed cast of elements —
   head, one media panel, three text beats, one CTA row —
   in a fixed composition: text left, media right. Scroll
   swaps what is in each of those two places rather than
   scrolling the whole act past.

   ── Why the cast is fixed ──
   The previous zone rendered the whole `<Showcase brief />`
   here: prose, a seven-row results table, a tabbed figure
   gallery, a video split. That is three to four viewport
   heights per study, and you cannot choreograph it — there
   is no arrangement of a scrubbed table that reads as
   deliberate. Depth moved to /work/<slug>, which already
   rendered every bit of it, and this shows the shape of the
   work instead: what it is, how it works, what came out.

   ── The rules the choreography obeys ──
   • Only `opacity`, `x`, `y` and `scale` are animated. Width,
     height, top and left are layout properties, cannot be
     composited, and are exactly how a scroll-linked
     animation loses frames.
   • Slot offsets are FRACTIONS of the measured slots box,
     resolved through function-based tween values with
     `invalidateOnRefresh`, so a resize re-measures instead
     of leaving pixel values baked at the old width.
   • Nothing is `once:` and nothing is one-directional. A
     scrubbed timeline is reversible by construction; the
     moment a side effect isn't idempotent, scrolling back up
     strands it.

   Markup and choreography live in the same file on purpose:
   they are coupled through the `data-act-*` attributes, and
   splitting them is how the two drift.
   ══════════════════════════════════════════════════════ */

/* ── The composition is fixed; only the content changes ─
   Text on the left, media on the right, for all nine beats in the zone.

   It used to relocate. The panel hopped between three slots per act and each
   beat entered from whichever side the panel had just vacated, which is a
   fine thing to watch once and a hostile thing to read: the reader had to go
   looking for the next sentence, and it was never where the last one was.
   Both sides are now pinned in CSS (`.zone-act-media { right: 0 }`,
   `.zone-act-beat { left: 0 }`) and nothing in this file sets `x` at all.

   The immersion moved into the transitions rather than being dropped. A beat
   cross-fades in place with a short rise; a slide cross-fades under a slight
   scale settle; the act-to-act swap keeps its overlap, so one study dissolves
   into the next. Same scroll cost, same sticky stage — the motion just stops
   asking the reader to follow it across the screen.

   ── Why there is still a scale on the slides ──
   A pure opacity crossfade between two stills reads as a slideshow. 1.04 → 1
   on the way in and 1 → 0.985 on the way out gives the swap a direction
   without moving anything the eye is tracking. Both are composited; neither
   touches layout. */
const SLIDE_IN_SCALE = 1.04;
const SLIDE_OUT_SCALE = 0.985;

/* ── The score ─────────────────────────────────────────
   Positions on a 0…1 timeline covering one act. The transitions are the gaps
   between the rest windows.

   THE GAPS ARE THE POINT, and the first version got their size badly wrong.
   A window of 0.05 gave the entire transition about 108px of scroll — one
   notch of a mouse wheel, which read as a cut rather than a change.

   Two passes since. The windows widened to 0.15, which fixed that but still
   read as hurried, and then the act itself went 300vh → 400vh (in
   globals.css) with the score rebalanced toward the gaps: 0.15 → 0.18, rests
   trimmed to pay for part of it. A transition is now ~518px, about five
   notches.

   The pacing survived the switch from relocation to cross-fade unchanged, and
   deliberately so: a cross-fade over five wheel notches is a dissolve you can
   watch, and one over a single notch is a jump cut. The scroll cost buys the
   same thing it always did.

   Why the split. The two levers are not equivalent — widening a window slows
   the change for free, while lengthening the act costs the reader scroll
   everywhere. So the ratio was pushed as far as it sensibly goes first (36%
   of an act in transitions against 49% of actual reading time) and only the
   remainder came from length. Pushing the ratio further would start eating
   the pauses the copy needs to be read in.

   `REST` are the windows where the composition is settled. Ludex's video
   plays only inside these — see CaseStudyZone. */
export const ACT = {
    entry: [0, 0.09],
    beats: [
        [0.09, 0.27],
        [0.45, 0.61],
        [0.79, 0.94],
    ],
    exit: [0.94, 1],
} as const;

/** Rest windows, in act-local progress. Derived so they cannot drift. */
export const REST = ACT.beats;

/**
 * Which slide a given beat shows.
 *
 * Clamped, so a two-slide study (Ludex) holds its second slide through the
 * closing beat instead of repeating one to pad the array out to three.
 *
 * EXPORTED because CaseStudyZone needs the same answer. It gates video
 * playback on the beat, and until it could ask this question it played
 * whichever `[data-act-video]` came first in the act — which for Ludex meant
 * the dashboard clip ran under a sign-in slide whose own video never started
 * and whose poster never lifted.
 */
export const slideForBeat = (beat: number, slideCount: number): number =>
    Math.min(beat, slideCount - 1);

/**
 * How far a later act's entry starts BEFORE its own act boundary.
 *
 * Without it the outgoing act reaches zero opacity at exactly the position
 * the incoming one starts from zero, so there is an instant of empty stage
 * between two case studies. Deliberately small: two full text compositions
 * at half opacity on top of each other is mud, not a crossfade.
 */
const ACT_OVERLAP = 0.05;

/**
 * Span of the two slow drifts that run the length of an act — the head's and
 * the one inside the media panel.
 *
 * Derived from the score rather than written as a literal. Both were
 * hardcoded (`0.82`, `0.84`, starting at `0.1`) and the score has since moved
 * twice; a drift that runs past `exit` fights the fade, and one that starts
 * before `entry` ends fights the entrance. Neither throws — they just look
 * slightly wrong.
 */
const DRIFT_SPAN = ACT.exit[0] - ACT.entry[1];

const BEAT_LABELS = ["What it is", "How it works", "The result"] as const;

/* ══════════════════════════════════════════════════════ */

/** One text beat. `buildAct` finds these by attribute, in DOM order. */
function Beat({ study, i }: { study: CaseStudy; i: number }) {
    const body = [study.intro, study.how, study.resultNote][i];

    return (
        <div data-act-beat data-beat-index={i} className="zone-act-beat">
            <p className="label">{BEAT_LABELS[i]}</p>
            <p className="body-sm mt-3">{body}</p>
        </div>
    );
}

export default function CaseStudyStage({
    study,
    index,
}: {
    study: CaseStudy;
    index: number;
}) {
    /* Index into `study.media` of the slide currently open, or null.
       ONE piece of state for both overlays, dispatched by the slide's own
       type below — two independent flags could both be set and would stack a
       lightbox on a video player.

       The affordance matches the full write-up's. The concise stage plays a
       clip muted and silent and renders a figure inside a fixed panel, and
       until this existed there was no way to look properly at either without
       leaving for /work/<slug>. */
    const [expanded, setExpanded] = useState<number | null>(null);
    const mediaRef = useRef<HTMLDivElement>(null);

    /* The still slides, in DOM order, with a lookup from their position in
       `study.media`.

       Built as its own list because Lightbox indexes ITS OWN array — passing
       a `study.media` index into a list that skipped the videos is an
       off-by-one that opens the wrong picture. No study mixes types today;
       Ludex proves the schema allows it. */
    const stills: LightboxImage[] = [];
    const stillIndexOf = new Map<number, number>();
    study.media.forEach((m, i) => {
        if (m.type !== "image") return;
        stillIndexOf.set(i, stills.length);
        stills.push({ src: m.src, alt: m.alt, caption: m.caption, w: m.w, h: m.h });
    });

    /** The inline <video> and its poster cover, for one slide. */
    const slideParts = useCallback((i: number) => {
        const slide = mediaRef.current?.querySelectorAll("[data-act-slide]")[i];
        return {
            video: slide?.querySelector<HTMLVideoElement>("[data-act-video]"),
            poster: slide?.querySelector<HTMLElement>("[data-act-poster]"),
        };
    }, []);

    const open = useCallback(
        (i: number) => {
            /* Pause the inline copy first. The player locks scroll, which
               stops Lenis, which stops ScrollTrigger updating — so the zone's
               own sync will not run again while the modal is up and would
               otherwise leave a second copy decoding behind it. */
            slideParts(i).video?.pause();
            setExpanded(i);
        },
        [slideParts],
    );

    const close = useCallback(() => {
        const i = expanded;
        setExpanded(null);
        if (i === null) return;

        /* Hand the clip back in the state the scroll position implies. The
           zone lifts a slide's poster only while that clip is meant to be
           running, so the poster's own opacity is the authority here — no new
           state to keep in step with it. */
        const { video, poster } = slideParts(i);
        if (video && poster?.style.opacity === "0") {
            void video.play().catch(() => {});
        }
    }, [expanded, slideParts]);

    const expandedMedia = expanded === null ? null : study.media[expanded];
    const expandedStill =
        expanded === null ? undefined : stillIndexOf.get(expanded);

    return (
        <article data-act data-act-index={index} className="zone-act">
            <div className="zone-act-frame section-container">
                <div className="zone-act-slots">
                    {/* h3: the page's h1 is the hero and FeaturedWork owns the
                        h2. The heading sits WITH its copy and metric here
                        rather than in a separate card that faded before the
                        content it named ever arrived. */}
                    <header data-act-head className="zone-act-head">
                        <p className="label-muted">
                            {String(index + 1).padStart(2, "0")} · {study.tag}
                        </p>

                        {/* Title and metric share one row so the head stays a
                            shallow band. `.metric-card`, not the hero numeral:
                            112px of digits is right when the number is the
                            largest thing on a page, and here it would outweigh
                            the title it belongs to and push the panel down
                            into the beat cards. */}
                        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
                            <div>
                                <h3 className="heading-md">{study.title}</h3>
                                {study.context && (
                                    <p className="label mt-2">
                                        {study.context}
                                    </p>
                                )}
                            </div>

                            <div className="shrink-0 sm:text-right">
                                <p className="metric-card text-accent">{study.metric}</p>
                                <p className="body-sm mt-1">
                                    {study.metricLabel}
                                </p>
                            </div>
                        </div>
                    </header>

                    {/* DOM order is the STACKED reading order — head, "what it
                        is", the figures, then how and the result. Desktop
                        positions all of these absolutely, so it is indifferent
                        to the order; a phone is not, and three figures before
                        a word of explanation reads as a gallery rather than a
                        case study. */}
                    <Beat study={study} i={0} />

                    <div
                        ref={mediaRef}
                        data-act-media
                        className="zone-act-media"
                    >
                        {study.media.map((m, i) => (
                            <figure
                                key={m.src}
                                data-act-slide
                                data-slide-index={i}
                                className="zone-act-slide"
                            >
                                <div className="zone-act-slide-frame shell-bezel">
                                    <div className="core-bezel relative w-full h-full overflow-hidden group/media">
                                        {m.type === "video" ? (
                                            <>
                                                {/* preload="none" and the
                                                    IntersectionObserver gate in
                                                    the zone mean a visitor who
                                                    never reaches #work
                                                    downloads zero video bytes. */}
                                                <video
                                                    data-act-video
                                                    src={m.src}
                                                    poster={m.poster}
                                                    preload="none"
                                                    loop
                                                    muted
                                                    playsInline
                                                    aria-label={m.alt}
                                                    className="absolute inset-0 w-full h-full object-contain"
                                                />
                                                {/* Covers the video while the
                                                    panel is travelling. A
                                                    decode and a scrubbed
                                                    transform on one layer is
                                                    where the frames go. */}
                                                <div
                                                    data-act-poster
                                                    className="zone-act-poster absolute inset-0"
                                                >
                                                    <Image
                                                        src={m.poster!}
                                                        alt={m.alt}
                                                        fill
                                                        sizes="(max-width: 1023px) 100vw, 50vw"
                                                        className="object-contain"
                                                    />
                                                </div>

                                                {/* "Expand", not "play": the
                                                    clip is already running by
                                                    the time this is reachable,
                                                    and the only thing a click
                                                    can add is size and
                                                    controls. Same wording and
                                                    same player as the write-up.

                                                    Overlaid rather than placed
                                                    in flow, so the choreography
                                                    measures the same box it
                                                    always did. */}
                                                <button
                                                    type="button"
                                                    data-cursor="expand"
                                                    onClick={() => open(i)}
                                                    aria-label={`Expand ${m.caption}`}
                                                    className="absolute top-3 right-3 z-10 flex items-center gap-2
                                                               px-3 py-2 rounded-full
                                                               bg-surface-0/90 backdrop-blur-sm border border-edge-strong
                                                               text-secondary hover:text-accent hover:border-accent
                                                               opacity-0 group-hover/media:opacity-100 focus-visible:opacity-100
                                                               transition-all duration-200"
                                                >
                                                    <svg
                                                        width="13"
                                                        height="13"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        aria-hidden="true"
                                                    >
                                                        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                                                    </svg>
                                                    <span className="mono text-xs tracking-widest uppercase">
                                                        Expand
                                                    </span>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <Image
                                                    src={m.src}
                                                    alt={m.alt}
                                                    fill
                                                    sizes="(max-width: 1023px) 100vw, 50vw"
                                                    className="object-contain"
                                                />

                                                {/* The same control the video
                                                    slides carry. A figure
                                                    rendered inside a fixed
                                                    panel is a thumbnail of a
                                                    diagram, and Gait's and
                                                    Double U-Net's slides had
                                                    no way to be read at all —
                                                    the asymmetry only became
                                                    obvious once Ludex next to
                                                    them could open. */}
                                                <button
                                                    type="button"
                                                    data-cursor="zoom"
                                                    onClick={() => open(i)}
                                                    aria-label={`Expand ${m.caption}`}
                                                    className="absolute top-3 right-3 z-10 flex items-center gap-2
                                                               px-3 py-2 rounded-full
                                                               bg-surface-0/90 backdrop-blur-sm border border-edge-strong
                                                               text-secondary hover:text-accent hover:border-accent
                                                               opacity-0 group-hover/media:opacity-100 focus-visible:opacity-100
                                                               transition-all duration-200"
                                                >
                                                    <svg
                                                        width="13"
                                                        height="13"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        aria-hidden="true"
                                                    >
                                                        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                                                    </svg>
                                                    <span className="mono text-xs tracking-widest uppercase">
                                                        Expand
                                                    </span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <figcaption className="body-sm text-tertiary">
                                    {m.caption}
                                </figcaption>
                            </figure>
                        ))}
                    </div>

                    <Beat study={study} i={1} />
                    <Beat study={study} i={2} />

                    <div data-act-ctas className="zone-act-ctas">
                        <CtaRow
                            ctas={study.ctas}
                            readMoreHref={`/work/${study.slug}`}
                        />
                    </div>
                </div>
            </div>

            {/* BOTH OVERLAYS ARE PORTALLED, and this is not optional. They are
                `position: fixed`, but `html.zone-immersive` puts
                `will-change: transform` on `.zone-act` — which makes that act
                the containing block for any fixed descendant. Rendered in
                place, either would be laid out inside the 100vh sticky stage
                and then clipped by its `overflow: hidden`: a full-screen
                overlay trapped in a panel.

                One `expanded` index picks which of the two opens, by the
                slide's own type, so they are mutually exclusive by
                construction rather than by two flags agreeing. */}
            {expandedMedia?.type === "video" &&
                typeof document !== "undefined" &&
                createPortal(
                    <VideoPlayer
                        src={expandedMedia.src}
                        poster={expandedMedia.poster}
                        label={expandedMedia.caption}
                        onClose={close}
                    />,
                    document.body,
                )}

            {expandedMedia?.type === "image" &&
                expandedStill !== undefined &&
                typeof document !== "undefined" &&
                createPortal(
                    <Lightbox
                        images={stills}
                        index={expandedStill}
                        /* Navigating inside the lightbox maps back to a
                           `study.media` index, so `close()` still hands the
                           right slide back to the zone. */
                        onNavigate={(next) => {
                            const back = study.media.findIndex(
                                (m) => m.src === stills[next].src,
                            );
                            if (back !== -1) setExpanded(back);
                        }}
                        onClose={close}
                    />,
                    document.body,
                )}
        </article>
    );
}

/* ══════════════════════════════════════════════════════
   The act's contribution to the master timeline.

   Called once per act by CaseStudyZone with the act element and a timeline
   position. Everything is expressed against the act's own 0…1 span and then
   offset, so the score above reads the same as the code.
   ══════════════════════════════════════════════════════ */
export function buildAct(
    tl: ReturnType<typeof gsap.timeline>,
    act: HTMLElement,
    at: number,
    span: number,
): void {
    const q = gsap.utils.selector(act);
    const head = q("[data-act-head]");
    const media = q("[data-act-media]");
    const slides = q("[data-act-slide]");
    const beatEls = q("[data-act-beat]");
    const ctas = q("[data-act-ctas]");

    const p = (v: number) => at + v * span;

    /* ── The first act does not animate in ──────────────
       The stage is sticky, so it spends a full viewport height scrolling up
       into view BEFORE its trigger starts and progress leaves 0. An entry ramp
       therefore isn't an entrance at all: it holds the composition at its
       from-state — invisible — for that entire 100vh, and the reader watches
       an empty box arrive. Act one is simply already there, and the
       choreography starts when they actually scroll.

       Later acts keep their entry: by then the stage is stuck, progress is
       moving, and the crossfade from the previous act is the whole point. */
    const isFirst = at === 0;

    /* `ei` — entry initial. Picks the hidden value for later acts and the
       resting value for the first, which turns act one's entry into an
       identity transition rather than a special case.

       It stays a `fromTo` either way, and that is not stylistic: a zero-
       duration `tl.set()` positioned at the very start of a scrub timeline
       never renders — the playhead is already at 0 and never crosses it — so
       the first version of this silently applied none of its slot offsets and
       the panel sat dead-centre. `fromTo` carries immediateRender, so the
       start state is on the element from build time, and it re-evaluates its
       function-based values when invalidateOnRefresh fires. */
    const ei = <T,>(hidden: T, resting: T): T => (isFirst ? resting : hidden);

    /* Later acts start entering before their own boundary, so the outgoing
       act is still dissolving as they arrive. The first act's entry is an
       identity transition, so its position is irrelevant. */
    const entryAt = isFirst ? p(0) : p(-ACT_OVERLAP);
    const entry = span * (ACT.entry[1] + (isFirst ? 0 : ACT_OVERLAP));

    /* The act layer: present for its own span, absent otherwise. Both edges
       are explicit so arriving from either direction lands on one state. */
    tl.fromTo(
        act,
        { autoAlpha: ei(0, 1) },
        { autoAlpha: 1, duration: entry, ease: EASE },
        entryAt,
    ).to(
        act,
        {
            autoAlpha: 0,
            duration: span * (ACT.exit[1] - ACT.exit[0]),
            ease: EASE,
        },
        p(ACT.exit[0]),
    );

    /* Head: rises in, then drifts up across the act so the composition keeps
       moving even while a beat is being read. */
    tl.fromTo(
        head,
        { y: ei(28, 0), opacity: ei(0, 1) },
        { y: 0, opacity: 1, duration: entry, ease: EASE },
        entryAt,
    ).to(
        head,
        { y: -26, duration: span * DRIFT_SPAN, ease: "none" },
        p(ACT.entry[1]),
    );

    /* Media panel. Placed by CSS grid; `x` and `y` are never touched, so the
       panel occupies the same rectangle from the first frame of act one to
       the last of act three. Only its contents change.

       NO `yPercent` HERE, and that is the second time this pairing has had to
       be unwound. It was `xPercent: -50` against `left: 50%`, then
       `yPercent: -50` against `top: 50%`. The panel is now a grid item in row
       2 with no percentage offset to cancel, so a leftover centring transform
       would lift it half its own height clean out of its row — which looks
       like a layout bug rather than a stale tween, and the tween is the last
       place anyone would go looking. */

    tl.fromTo(
        media,
        { scale: ei(0.97, 1), opacity: ei(0, 1) },
        { scale: 1, opacity: 1, duration: entry, ease: EASE },
        entryAt,
    );

    /* The gaps between rest windows. They no longer carry a relocation, but
       they are still where a slide changes and a beat is swapped — the score
       is unchanged, only what happens inside it. */
    const hops = ACT.beats.map((_, i) => ({
        from: i > 0 ? ACT.beats[i - 1][1] : 0,
        to: ACT.beats[i][0],
    }));

    /* ── Nothing is ever completely still ──────────────
       A slow drift inside the panel, so a beat being read is a composition
       settling rather than a composition frozen.

       It goes on the slide FRAME, not the panel: the panel owns x/y/scale
       through the hops, and layering a drift on top of those absolute targets
       is how two tweens start fighting over one property. The frame is
       animated by nothing else.

       ONE continuous tween across the whole act, not one per rest window.
       Per-window `fromTo`s were tried first and each started from +8 while the
       previous had ended at -8, so the image snapped 16px at the top of every
       beat — the exact opposite of the intent. A single monotonic drift cannot
       discontinue, and `ease: "none"` keeps it below the threshold of reading
       as an event rather than as the image simply being alive. */
    const frames = q("[data-act-slide] .zone-act-slide-frame");

    tl.fromTo(
        frames,
        { y: 10 },
        { y: -10, duration: span * DRIFT_SPAN, ease: "none" },
        p(ACT.entry[1]),
    );

    /* Which slide each beat shows — the same mapping CaseStudyZone reads to
       decide which clip may play. */
    const slideOfBeat = ACT.beats.map((_, i) => slideForBeat(i, slides.length));

    /* Start state outside the timeline. The crossfades below are `fromTo` and
       therefore state their own start and end explicitly — a plain `.to()`
       re-records its start value from whatever is on screen when
       invalidateOnRefresh fires, which on a mid-act resize is a half-faded
       slide that then becomes the new resting state. */
    slides.forEach((slide, i) =>
        gsap.set(slide, { autoAlpha: i === 0 ? 1 : 0, scale: 1 }),
    );

    for (let i = 1; i < slideOfBeat.length; i++) {
        const prev = slideOfBeat[i - 1];
        const next = slideOfBeat[i];
        if (prev === next) continue;

        const { from, to } = hops[i];
        const duration = span * (to - from);

        /* The outgoing slide settles back as the incoming one comes forward,
           both over the full hop window. Overlapping rather than sequential:
           a gap between the two would show the empty panel through them.

           `immediateRender: false` ON BOTH, and that is not optional past the
           first pair. `fromTo`'s immediateRender applies its FROM state the
           instant the tween is BUILT, not when the timeline reaches it — true
           regardless of the tween's own position, which is exactly what makes
           the entry tweens above work at position 0. Here it is a bug: a study
           with three media slides runs this loop twice, and the second
           iteration's `slides[prev]` is the FIRST iteration's `slides[next]`.
           Its `{ autoAlpha: 1 }` from-state rendered immediately overwrote the
           correct resting-hidden state `gsap.set` had just given that slide,
           so the middle slide of any three-slide study came up visible at
           full opacity from the first frame — one image painted over another,
           both captions in the same box at once. `gsap.set` above already
           states the true starting condition; these two only need to fire
           when the timeline actually arrives. */
        tl.fromTo(
            slides[prev],
            { autoAlpha: 1, scale: 1 },
            {
                autoAlpha: 0,
                scale: SLIDE_OUT_SCALE,
                duration,
                ease: EASE,
                immediateRender: false,
            },
            p(from),
        ).fromTo(
            slides[next],
            { autoAlpha: 0, scale: SLIDE_IN_SCALE },
            {
                autoAlpha: 1,
                scale: 1,
                duration,
                ease: EASE,
                immediateRender: false,
            },
            p(from),
        );
    }

    /* Beat cards: a cross-fade in place with a short rise. They all share one
       column now, so a beat rises the last 22px into the exact position the
       previous one left and continues upward on the way out — the column
       reads as one thing being rewritten rather than three cards arriving
       from three directions.

       No `x`. That is the whole point of the fixed sides, and it is the one
       property to keep out of this tween if the entrance is ever retuned. */
    beatEls.forEach((el, i) => {
        const [start, end] = ACT.beats[i];
        /* Kept in proportion to the hop windows. Leave this at 0.05 and the
           text snaps while the slide behind it still glides, which is worse
           than both being fast — the two stop looking like one composition. */
        const lead = span * 0.1;

        /* Beat one of act one is part of the already-composed opening; every
           other beat fades up. */
        const opening = isFirst && i === 0;

        tl.fromTo(
            el,
            { autoAlpha: opening ? 1 : 0, y: opening ? 0 : 22 },
            { autoAlpha: 1, y: 0, duration: lead, ease: EASE },
            opening ? p(0) : p(start) - lead * 0.5,
        ).to(
            el,
            { autoAlpha: 0, y: -18, duration: span * 0.08, ease: EASE },
            p(end),
        );
    });

    /* CTAs belong to the closing beat only. */
    tl.fromTo(
        ctas,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: span * 0.1, ease: EASE },
        p(ACT.beats[2][0]),
    ).to(
        ctas,
        { autoAlpha: 0, duration: span * 0.06, ease: EASE },
        p(ACT.exit[0]),
    );
}
