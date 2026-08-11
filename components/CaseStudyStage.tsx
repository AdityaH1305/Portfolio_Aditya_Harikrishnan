"use client";

import Image from "next/image";
import CtaRow from "@/components/CtaRow";
import { gsap, EASE } from "@/lib/motion";
import type { CaseStudy } from "@/lib/caseStudies";

/* ══════════════════════════════════════════════════════
   CaseStudyStage — one act of the choreographed zone

   Three of these are stacked in the same sticky 100vh box
   (see CaseStudyZone). An act is a fixed cast of elements —
   head, one media panel, three text beats, one CTA row —
   and scroll moves them between slots rather than scrolling
   them past.

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

/* ── Slot geometry ─────────────────────────────────────
   Every value is a fraction of the slots box (its width for x, its height
   for y), so the composition holds its proportions from 1024px up.

   The media panel is centre-anchored — `xPercent/yPercent: -50` in the
   timeline — so these are offsets from the middle of the box, not from its
   corner. The panel is min(40vw, 560px) wide, and the beat cards are
   min(30vw, 380px) on the opposite side; the numbers below are chosen to
   leave a real gutter between them at every width in that range rather than
   to look right at one. */
const MEDIA_SLOTS = [
    { x: 0.24, y: 0.08, scale: 1 },
    { x: -0.24, y: 0.08, scale: 0.94 },
    { x: 0.26, y: 0.02, scale: 0.76 },
] as const;

/** Which side each beat's text sits on — opposite the media panel. */
const BEAT_SLOTS = ["left", "right", "left"] as const;

/* ── The score ─────────────────────────────────────────
   Positions on a 0…1 timeline covering one act. The relocations are the gaps
   between the rest windows.

   THE GAPS ARE THE POINT, and the first version got their size badly wrong.
   An act is 300vh of scroll — ~2160px on a 720px-tall viewport — so a hop
   window of 0.05 gave the entire relocation about 108px, which is one notch
   of a mouse wheel. The panel appeared to teleport between two resting
   positions; there was no motion to see. At 0.15 a hop takes ~324px, roughly
   three notches, and reads as travel.

   Rest windows shrank to pay for it (0.25 → ~0.18), because the fix is the
   ratio, not the act length: holding a beat for 540px was never the problem.

   `REST` are the windows where the media panel is stationary. Ludex's video
   plays only inside these — see CaseStudyZone. */
export const ACT = {
    entry: [0, 0.1],
    beats: [
        [0.1, 0.3],
        [0.45, 0.62],
        [0.77, 0.94],
    ],
    exit: [0.94, 1],
} as const;

/** Rest windows, in act-local progress. Derived so they cannot drift. */
export const REST = ACT.beats;

/**
 * How far a later act's entry starts BEFORE its own act boundary.
 *
 * Without it the outgoing act reaches zero opacity at exactly the position
 * the incoming one starts from zero, so there is an instant of empty stage
 * between two case studies. Deliberately small: two full text compositions
 * at half opacity on top of each other is mud, not a crossfade.
 */
const ACT_OVERLAP = 0.05;

const BEAT_LABELS = ["What it is", "How it works", "The result"] as const;

/* ══════════════════════════════════════════════════════ */

/** One text beat. `buildAct` finds these by attribute, in DOM order. */
function Beat({ study, i }: { study: CaseStudy; i: number }) {
    const body = [study.intro, study.how, study.resultNote][i];

    return (
        <div
            data-act-beat
            data-beat-index={i}
            data-slot={BEAT_SLOTS[i]}
            className="zone-act-beat"
        >
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
    return (
        <article data-act className="zone-act">
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
                                <p className="metric-card">{study.metric}</p>
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

                    <div data-act-media className="zone-act-media">
                        {study.media.map((m, i) => (
                            <figure
                                key={m.src}
                                data-act-slide
                                data-slide-index={i}
                                className="zone-act-slide"
                            >
                                <div className="zone-act-slide-frame shell-bezel">
                                    <div className="core-bezel relative w-full h-full overflow-hidden">
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
                                                        sizes="(max-width: 1023px) 100vw, 560px"
                                                        className="object-contain"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <Image
                                                src={m.src}
                                                alt={m.alt}
                                                fill
                                                sizes="(max-width: 1023px) 100vw, 560px"
                                                className="object-contain"
                                            />
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

    /* Measured lazily inside the tween functions so `invalidateOnRefresh`
       picks up a new viewport without the timeline being rebuilt. */
    const box = () => {
        const el = act.querySelector<HTMLElement>(".zone-act-slots");
        const r = el?.getBoundingClientRect();
        return { w: r?.width ?? 0, h: r?.height ?? 0 };
    };

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

    const slotX = (i: number) => () => box().w * MEDIA_SLOTS[i].x;
    const slotY = (i: number) => () => box().h * MEDIA_SLOTS[i].y;

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
    ).to(head, { y: -26, duration: span * 0.82, ease: "none" }, p(0.1));

    /* Media panel: the element that actually relocates. Centre-anchored, so
       the slot offsets are measured from the middle of the box. */
    gsap.set(media, { xPercent: -50, yPercent: -50 });

    tl.fromTo(
        media,
        {
            x: slotX(0),
            y: slotY(0),
            scale: ei(MEDIA_SLOTS[0].scale * 0.94, MEDIA_SLOTS[0].scale),
            opacity: ei(0, 1),
        },
        {
            x: slotX(0),
            y: slotY(0),
            scale: MEDIA_SLOTS[0].scale,
            opacity: 1,
            duration: entry,
            ease: EASE,
        },
        entryAt,
    );

    /* One hop per gap between rest windows. MEDIA_SLOTS is indexed by beat,
       so it must stay the same length as ACT.beats. */
    const hops = ACT.beats.map((_, i) => ({
        from: i > 0 ? ACT.beats[i - 1][1] : 0,
        to: ACT.beats[i][0],
    }));

    for (let i = 1; i < ACT.beats.length; i++) {
        const { from, to } = hops[i];
        tl.to(
            media,
            {
                x: slotX(i),
                y: slotY(i),
                scale: MEDIA_SLOTS[i].scale,
                duration: span * (to - from),
                ease: EASE,
            },
            p(from),
        );
    }

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
        { y: -10, duration: span * 0.84, ease: "none" },
        p(0.1),
    );

    /* Which slide each beat shows. Clamped, so a two-slide study (Ludex) holds
       its second slide through the closing beat instead of repeating one to
       pad the array out to three. */
    const slideForBeat = ACT.beats.map((_, i) =>
        Math.min(i, slides.length - 1),
    );

    /* Start state outside the timeline. The crossfades below are `fromTo` and
       therefore state their own start and end explicitly — a plain `.to()`
       re-records its start value from whatever is on screen when
       invalidateOnRefresh fires, which on a mid-act resize is a half-faded
       slide that then becomes the new resting state. */
    slides.forEach((slide, i) =>
        gsap.set(slide, { autoAlpha: i === 0 ? 1 : 0 }),
    );

    for (let i = 1; i < slideForBeat.length; i++) {
        const prev = slideForBeat[i - 1];
        const next = slideForBeat[i];
        if (prev === next) continue;

        const { from, to } = hops[i];
        const duration = span * (to - from);

        tl.fromTo(
            slides[prev],
            { autoAlpha: 1 },
            { autoAlpha: 0, duration, ease: EASE },
            p(from),
        ).fromTo(
            slides[next],
            { autoAlpha: 0 },
            { autoAlpha: 1, duration, ease: EASE },
            p(from),
        );
    }

    /* Beat cards: each enters from its own side and leaves the same way, so
       the swap reads as the text relocating across the stage rather than
       three paragraphs blinking in place. */
    beatEls.forEach((el, i) => {
        const [start, end] = ACT.beats[i];
        const dir = BEAT_SLOTS[i] === "left" ? -1 : 1;
        /* Kept in proportion to the widened hops. Leave this at 0.05 and the
           panel glides while the text still snaps, which is worse than both
           being fast — the two stop looking like one composition. */
        const lead = span * 0.1;

        /* Beat one of act one is part of the already-composed opening; every
           other beat arrives from its own side. */
        const opening = isFirst && i === 0;

        tl.fromTo(
            el,
            {
                autoAlpha: opening ? 1 : 0,
                x: opening ? 0 : 34 * dir,
                y: opening ? 0 : 14,
            },
            { autoAlpha: 1, x: 0, y: 0, duration: lead, ease: EASE },
            opening ? p(0) : p(start) - lead * 0.5,
        ).to(
            el,
            {
                autoAlpha: 0,
                x: 26 * dir,
                y: -12,
                duration: span * 0.08,
                ease: EASE,
            },
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
