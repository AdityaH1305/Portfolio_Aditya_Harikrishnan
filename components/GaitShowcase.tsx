"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { useTabUnderline } from "@/lib/useTabUnderline";

/* ══════════════════════════════════════════════════════
   GaitShowcase — Featured Work, project 01

   Full-width media band, like the Double U-Net block.

   Two galleries, deliberately given DIFFERENT treatments
   so a scrolling reader can't confuse them:

     • Results & Analysis — five figures of wildly varying
       shape (3:1 wide through 1:1.87 portrait), so they
       are tabbed and shown one at a time at natural size.
     • Preprocessed Input — three 64×64 silhouettes, tiny
       and uniform, so all three sit side by side with no
       interaction at all.

   Numbers come from §11 of the internship report (the
   measured results table). §12.1 of that report quotes a
   different, rounder set that appears nowhere else and
   matches neither reference paper — deliberately not used.
   ══════════════════════════════════════════════════════ */

const GAITSET_PAPER = "/gaitset-cross-view-gait-recognition.pdf";
const FUSION_PAPER = "/gaitset-multimodal-fusion.pdf";

/** Rank-1 identification against a closed gallery. */
const identification = [
    { label: "Normal walking", code: "NM", value: "98.00%", lead: true },
    { label: "Bag carrying", code: "BG", value: "82.24%" },
    { label: "Coat wearing", code: "CL", value: "45.36%" },
    { label: "Overall", code: "", value: "75.20%" },
];

/** Open-set verification — a different problem, reported separately. */
const verification = [
    { label: "ROC AUC", value: "0.5876" },
    { label: "Equal Error Rate", value: "44.94%" },
    { label: "Optimal threshold", value: "0.0077" },
];

const narrative = [
    {
        title: "The Problem",
        body: "Surveillance identity checks have to survive things the subject controls and the camera doesn't — a different viewing angle, a dropped frame, a heavy coat. Sequence-based models assume a clean, ordered, fixed-length walk, and degrade as soon as that assumption breaks.",
    },
    {
        title: "The Approach",
        body: "Treat a walk as an unordered set of silhouettes rather than a time series, so recognition is permutation-invariant and indifferent to sequence length. A second branch adds Gait Energy Images and Gait Energy Motion Images — the latter built specifically to survive coat occlusion by amplifying ankle and wrist motion while suppressing the static torso.",
    },
    {
        title: "The Result",
        body: "98.00% Rank-1 under normal walking, ahead of the published GaitSet baseline on the same dataset. Occlusion is where it gives ground, and the open-set verification numbers show the embedding ranks identities better than it thresholds them.",
    },
];

/* Five figures, in report order, attention map last.
   `layout` matters: `wide` figures pan horizontally inside the panel on
   narrow screens; `portrait` is capped by height instead, because
   pipeline.png is 916×1717 and at full width would render ~1700px tall. */
const figures: {
    id: string;
    label: string;
    layout: "wide" | "portrait";
    minW?: string;
    caption: string;
    src: string;
    w: number;
    h: number;
    alt: string;
}[] = [
    {
        id: "architecture",
        label: "Architecture",
        layout: "wide",
        minW: "min-w-[700px]",
        caption:
            "Spatial set-pooling backbone and temporal template branch fusing into a 256-d embedding.",
        src: "/gait/architecture.webp",
        w: 912,
        h: 300,
        alt: "Network architecture: silhouette frames enter a per-frame CNN with set pooling, GEI and GEnI templates enter a parallel branch, and both fuse through a horizontal pooling module into a 256-dimensional embedding.",
    },
    {
        id: "pipeline",
        label: "Pipeline",
        layout: "portrait",
        caption:
            "End-to-end flow from raw CASIA-B video through silhouette extraction, alignment and tensor serialisation to embedding.",
        src: "/gait/pipeline.webp",
        w: 916,
        h: 1717,
        alt: "Vertical pipeline diagram running from raw video capture through background removal, centroid tracking, 64×64 alignment, npy serialisation, model training and finally identity embedding.",
    },
    {
        id: "training",
        label: "Training",
        layout: "wide",
        minW: "min-w-[720px]",
        caption:
            "150 epochs — cross-entropy and triplet loss falling together as classification accuracy climbs.",
        src: "/gait/training.webp",
        w: 1501,
        h: 519,
        alt: "Training curves over 150 epochs showing cross-entropy loss and triplet loss decreasing while classification accuracy increases.",
    },
    {
        id: "roc-eer",
        label: "ROC–EER",
        layout: "wide",
        minW: "min-w-[480px]",
        caption:
            "Open-set verification: AUC 0.5876, with the equal error rate at 44.94% where FAR meets FRR.",
        src: "/gait/roc-eer.webp",
        w: 1272,
        h: 1131,
        alt: "Receiver operating characteristic curve for open-set gait verification, area under curve 0.5876, with the equal error rate marked at 44.94%.",
    },
    {
        id: "attention",
        label: "Attention",
        layout: "wide",
        minW: "min-w-[520px]",
        caption:
            "Dynamic-branch attention at epochs 10, 50, 100 and 150 — sharp early hot spots settling into an even distribution as the fusion learns.",
        src: "/gait/attenion_map.webp",
        w: 1254,
        h: 1254,
        alt: "Four heatmaps of dynamic branch attention at epochs 10, 50, 100 and 150, showing concentrated high-activation regions early in training flattening into a more uniform distribution by epoch 150.",
    },
];

/* CASIA-B walking conditions, as the model actually sees them. */
const conditions = [
    { src: "/gait/normal.png", code: "NM", label: "Normal walking" },
    { src: "/gait/coat.png", code: "CL", label: "Coat wearing" },
    { src: "/gait/bag.png", code: "BG", label: "Bag carrying" },
];

const techStack = [
    "Python",
    "PyTorch",
    "NumPy",
    "OpenCV",
    "Triplet Loss",
    "CASIA-B",
];

/* ══════════════════════════════════════════════════════ */

export default function GaitShowcase() {
    const [activeFigure, setActiveFigure] = useState(0);
    const { rowRef, tabRefs, underlineRef } = useTabUnderline(activeFigure);

    const figure = figures[activeFigure];

    return (
        <article>
            {/* ═══════════ HEADER ═══════════ */}
            <div className="section-container">
                <Reveal stagger={0.08}>
                    <p data-reveal-child className="label-muted">
                        Gait Biometrics / Computer Vision
                    </p>
                    <h2 data-reveal-child className="heading-xl mt-4">
                        Gait Recognition via Multi-Modal Fusion
                    </h2>
                    <p data-reveal-child className="label mt-5">
                        ISRO · Liquid Propulsion Systems Centre
                    </p>
                    <p data-reveal-child className="body-lg mt-6 max-w-2xl">
                        A cross-view gait recognition pipeline built on GaitSet,
                        which treats a walking sequence as an unordered set of
                        silhouettes rather than a time series — so identity
                        survives dropped frames and variable walking speed. A
                        multi-modal fusion branch adds Gait Energy Images and
                        Gait Energy Motion Images on top of the spatial stream.
                    </p>
                </Reveal>

                {/* ═══════════ RESULTS ═══════════
                    Split by task on purpose: Rank-1 identification ranks
                    within a known gallery, verification needs a calibrated
                    global threshold. Reporting one number for both would
                    misrepresent what the model does well. */}
                <div className="mt-14 md:mt-20 grid lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] gap-12 lg:gap-16 items-start">
                    <Reveal y={28} duration={0.8}>
                        <span className="ludex-hero-metric">98.00%</span>
                        <p className="text-base md:text-lg text-secondary max-w-[22rem] leading-snug mt-2">
                            Rank-1 accuracy under normal walking, above the
                            published GaitSet baseline of 96.1% on the same
                            dataset.
                        </p>
                    </Reveal>

                    <Reveal y={20} duration={0.6} delay={0.1}>
                        <div className="grid sm:grid-cols-2 gap-10">
                            {/* Identification */}
                            <div>
                                <p className="label-muted pb-3 border-b border-edge-default">
                                    Identification · Rank-1
                                </p>
                                <div className="mt-4 flex flex-col gap-3.5">
                                    {identification.map((r) => (
                                        <div
                                            key={r.label}
                                            className="flex items-baseline gap-3"
                                        >
                                            <span
                                                className={`text-sm ${
                                                    r.lead
                                                        ? "text-primary"
                                                        : "text-secondary"
                                                }`}
                                            >
                                                {r.label}
                                            </span>
                                            {r.code && (
                                                <span className="mono text-[10px] text-quaternary">
                                                    {r.code}
                                                </span>
                                            )}
                                            <span
                                                className={`ml-auto mono text-sm ${
                                                    r.lead
                                                        ? "text-accent font-semibold"
                                                        : "text-secondary"
                                                }`}
                                            >
                                                {r.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Verification */}
                            <div>
                                <p className="label-muted pb-3 border-b border-edge-default">
                                    Verification · Open-set
                                </p>
                                <div className="mt-4 flex flex-col gap-3.5">
                                    {verification.map((r) => (
                                        <div
                                            key={r.label}
                                            className="flex items-baseline gap-3"
                                        >
                                            <span className="text-sm text-secondary">
                                                {r.label}
                                            </span>
                                            <span className="ml-auto mono text-sm text-secondary">
                                                {r.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <p className="body-sm mt-5 text-tertiary">
                                    The embedding ranks identities well inside a
                                    known gallery but isn&apos;t globally
                                    calibrated, so a single accept/reject
                                    threshold performs close to chance. Two
                                    different problems.
                                </p>
                            </div>
                        </div>
                    </Reveal>
                </div>

                {/* ═══════════ NARRATIVE ═══════════ */}
                <Reveal
                    stagger={0.1}
                    className="mt-20 md:mt-28 grid lg:grid-cols-3 gap-12 lg:gap-14"
                >
                    {narrative.map((n) => (
                        <div key={n.title} data-reveal-child>
                            <h3 className="heading-sm">{n.title}</h3>
                            <p className="body-sm mt-3">{n.body}</p>
                        </div>
                    ))}
                </Reveal>
            </div>

            {/* ═══════════ GALLERY 1 — RESULTS & ANALYSIS ═══════════ */}
            <div className="section-container">
                <div className="mt-20 md:mt-28">
                    <Reveal stagger={0.08} className="mb-6">
                        <p data-reveal-child className="label">
                            Results &amp; Analysis
                        </p>
                        <p
                            data-reveal-child
                            className="body-sm mt-2 max-w-xl text-tertiary"
                        >
                            Model architecture, the processing pipeline, and how
                            it behaved during training and evaluation.
                        </p>
                    </Reveal>

                    {/* rowRef must stay relative and be the direct offsetParent
                        of the buttons — the underline tween reads offsetLeft. */}
                    <div
                        ref={rowRef}
                        role="tablist"
                        aria-label="Gait recognition figures"
                        className="flex flex-wrap gap-6 mb-5 relative"
                    >
                        {figures.map((f, i) => (
                            <button
                                key={f.id}
                                ref={(el) => {
                                    tabRefs.current[i] = el;
                                }}
                                role="tab"
                                id={`gait-tab-${f.id}`}
                                aria-selected={activeFigure === i}
                                aria-controls={`gait-panel-${f.id}`}
                                onClick={() => setActiveFigure(i)}
                                className={`text-sm font-medium pb-1.5 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                                    activeFigure === i
                                        ? "text-primary"
                                        : "text-tertiary hover:text-secondary"
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                        <span
                            ref={underlineRef}
                            aria-hidden="true"
                            className="absolute bottom-0 left-0 h-px w-0 bg-accent pointer-events-none"
                        />
                    </div>

                    <div className="shell-bezel">
                        <div className="core-bezel overflow-hidden">
                            <div
                                role="tabpanel"
                                id={`gait-panel-${figure.id}`}
                                aria-labelledby={`gait-tab-${figure.id}`}
                                className={
                                    figure.layout === "portrait"
                                        ? "p-3"
                                        : "overflow-x-auto"
                                }
                            >
                                {figure.layout === "portrait" ? (
                                    /* Height-capped and centred: at full width
                                       this diagram would be ~1700px tall.

                                       The cap is a max-WIDTH derived from the
                                       aspect ratio, not `max-h` + `w-auto`.
                                       Auto width resolves against the image's
                                       natural size, which is 0 until a lazy
                                       image loads — so the figure collapsed to
                                       0×0. A width-based cap is definite from
                                       first paint. */
                                    <div
                                        className="mx-auto"
                                        style={{
                                            maxWidth: `min(100%, calc(70vh * ${figure.w} / ${figure.h}))`,
                                        }}
                                    >
                                        <Image
                                            src={figure.src}
                                            alt={figure.alt}
                                            width={figure.w}
                                            height={figure.h}
                                            sizes="(max-width: 768px) 100vw, 480px"
                                            className="w-full h-auto block rounded-lg"
                                        />
                                    </div>
                                ) : (
                                    <div className={`${figure.minW} p-3`}>
                                        {/* Same height cap as the portrait
                                            branch. For genuinely wide figures
                                            the computed width exceeds the
                                            container so `min()` picks 100% and
                                            it never binds; for the near-square
                                            ROC and attention figures it stops
                                            them growing past one screen. */}
                                        <div
                                            className="mx-auto"
                                            style={{
                                                maxWidth: `min(100%, calc(70vh * ${figure.w} / ${figure.h}))`,
                                            }}
                                        >
                                            <Image
                                                src={figure.src}
                                                alt={figure.alt}
                                                width={figure.w}
                                                height={figure.h}
                                                sizes="(max-width: 768px) 100vw, 940px"
                                                className="w-full h-auto block rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="body-sm mt-4 text-tertiary max-w-2xl">
                        {figure.caption}
                    </p>
                </div>
            </div>

            {/* ═══════════ GALLERY 2 — PREPROCESSED INPUT ═══════════
                Deliberately not tabbed. These are 64×64 model inputs, not
                figures — showing all three at once, small and crisp, makes
                the distinction from the results gallery obvious. */}
            <div className="section-container">
                <div className="mt-24 md:mt-32">
                    <Reveal stagger={0.08} className="mb-6">
                        <p data-reveal-child className="label">
                            Preprocessed Input · CASIA-B
                        </p>
                        <p
                            data-reveal-child
                            className="body-sm mt-2 max-w-xl text-tertiary"
                        >
                            What the network actually receives. Every frame is
                            background-stripped, centroid-tracked and projected
                            onto a uniform 64×64 grid — one per walking
                            condition below.
                        </p>
                    </Reveal>

                    <div className="shell-bezel compact-bezel">
                        <div className="core-bezel px-6 py-8 md:px-10 md:py-10">
                            {/* Sized to keep all three on one row at 375px:
                                the inner measure there is ~267px, so 3×64 plus
                                two 16px gaps fits where 3×96 did not. 64px is
                                also the images' native size, so on mobile they
                                are shown 1:1 with no upscale at all. */}
                            <div className="flex gap-4 md:gap-14">
                                {conditions.map((c) => (
                                    <figure key={c.code}>
                                        {/* unoptimized + pixelated: these are
                                            1.2KB 64px silhouettes. Transcoding
                                            softens hard edges, and smoothing on
                                            upscale hides the real input
                                            resolution. */}
                                        <Image
                                            src={c.src}
                                            alt={`CASIA-B ${c.label} silhouette, 64 by 64 pixels`}
                                            width={64}
                                            height={64}
                                            unoptimized
                                            className="w-16 h-16 md:w-28 md:h-28 block rounded-md bg-surface-0 [image-rendering:pixelated]"
                                        />
                                        <figcaption className="mt-3">
                                            <span className="mono text-[10px] text-accent tracking-widest">
                                                {c.code}
                                            </span>
                                            <span className="block text-xs md:text-sm text-secondary mt-1 leading-snug">
                                                {c.label}
                                            </span>
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>

                            <p className="label-muted mt-8 pt-5 border-t border-edge normal-case tracking-normal">
                                64 × 64 px · background-stripped silhouette
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════ DATASET NOTE + STACK + CTAs ═══════════ */}
            <div className="section-container">
                <Reveal
                    stagger={0.08}
                    className="mt-20 md:mt-24 flex flex-col items-start gap-8"
                >
                    <p
                        data-reveal-child
                        className="body-sm max-w-2xl text-tertiary"
                    >
                        Gait recognition is a young field with few open
                        datasets. CASIA-B remains one of the only public
                        benchmarks offering controlled cross-view and covariate
                        coverage, which bounds how far occlusion performance can
                        be pushed without collecting new data.
                    </p>

                    <p
                        data-reveal-child
                        className="mono text-xs text-tertiary leading-relaxed"
                    >
                        {techStack.join("  ·  ")}
                    </p>

                    {/* No report CTA for this project — the two reference
                        papers it builds on get the credit instead. */}
                    <div data-reveal-child className="flex flex-wrap gap-4">
                        <a
                            href={GAITSET_PAPER}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                        >
                            GaitSet Paper
                            <svg
                                className="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path d="M7 17L17 7M17 7H7M17 7v10" />
                            </svg>
                        </a>
                        <a
                            href={FUSION_PAPER}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                        >
                            Multimodal Fusion Paper
                        </a>
                    </div>

                    <p
                        data-reveal-child
                        className="label-muted normal-case tracking-normal"
                    >
                        Chao et al., IEEE TPAMI 2022 · Shi et al., IEEE Access 2025
                    </p>
                </Reveal>
            </div>
        </article>
    );
}
