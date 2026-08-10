"use client";

import Image from "next/image";
import Reveal from "@/components/Reveal";
import FigureGallery, { type Figure } from "@/components/FigureGallery";
import GaitPipeline from "@/components/GaitPipeline";
import CtaRow from "@/components/CtaRow";
import { CASE_STUDIES } from "@/lib/caseStudies";

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

const REPO = "https://github.com/AdityaH1305/Gait-Multi-Modal-Fusion";
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

/* Three figures, down from five.
   The Pipeline figure went because the interactive canvas below shows the
   same thing, live — a static diagram of it was pure duplication. The
   attention map went as the least load-bearing of the remainder.
   `minW` marks the wide ones, which pan horizontally on narrow screens. */
const figures: Figure[] = [
    {
        id: "architecture",
        label: "Architecture",
        minW: "max-md:min-w-[700px]",
        caption:
            "Spatial set-pooling backbone and temporal template branch fusing into a 256-d embedding.",
        src: "/gait/architecture.webp",
        w: 912,
        h: 300,
        alt: "Network architecture: silhouette frames enter a per-frame CNN with set pooling, GEI and GEnI templates enter a parallel branch, and both fuse through a horizontal pooling module into a 256-dimensional embedding.",
    },
    {
        id: "training",
        label: "Training",
        minW: "max-md:min-w-[720px]",
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
        minW: "max-md:min-w-[480px]",
        caption:
            "Open-set verification: AUC 0.5876, with the equal error rate at 44.94% where FAR meets FRR.",
        src: "/gait/roc-eer.webp",
        w: 1272,
        h: 1131,
        alt: "Receiver operating characteristic curve for open-set gait verification, area under curve 0.5876, with the equal error rate marked at 44.94%.",
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

const STUDY = CASE_STUDIES[0];

/* One table instead of two. Identification and verification measure
   different things, so the task column keeps that distinction — but two
   separate tables for seven rows was more structure than the data needed. */
const results = [
    ...identification.map((r) => ({ ...r, task: "Identification" })),
    ...verification.map((r) => ({
        label: r.label,
        code: "",
        value: r.value,
        lead: false,
        task: "Verification",
    })),
];

export default function GaitShowcase({ brief = false }: { brief?: boolean }) {
    return (
        <article>
            {/* Eyebrow, title and affiliation live in CaseStudyHero — this
                is a route now, so that block owns the page's <h1>. */}
            <div className="section-container">
                <Reveal y={20}>
                    <p className="body-lg measure">{STUDY.intro}</p>
                    <p className="body-lg measure mt-6">{STUDY.how}</p>
                </Reveal>

                {/* ═══════════ RESULTS ═══════════
                    One table, task column intact. Identification ranks within
                    a known gallery and verification needs a calibrated global
                    threshold — genuinely different measurements, which is why
                    the column stays even though the two tables merged. */}
                <div className="mt-14 md:mt-20 grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-12 lg:gap-16 items-start">
                    <Reveal y={20} duration={0.6}>
                        <table className="w-full text-left border-collapse">
                            <caption className="label-muted text-left pb-3">
                                Results · CASIA-B
                            </caption>
                            <tbody>
                                {results.map((r) => (
                                    <tr
                                        key={`${r.task}-${r.label}`}
                                        className="border-b border-edge"
                                    >
                                        <td className="py-2.5 mono text-[10px] text-quaternary align-baseline pr-4">
                                            {r.task}
                                        </td>
                                        <td
                                            className={`py-2.5 text-sm align-baseline ${
                                                r.lead
                                                    ? "text-primary"
                                                    : "text-secondary"
                                            }`}
                                        >
                                            {r.label}
                                            {r.code && (
                                                <span className="mono text-[10px] text-quaternary ml-2">
                                                    {r.code}
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            className={`py-2.5 text-right mono text-sm align-baseline ${
                                                r.lead
                                                    ? "text-accent font-semibold"
                                                    : "text-secondary"
                                            }`}
                                        >
                                            {r.value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Reveal>

                    <Reveal y={28} duration={0.8} delay={0.1}>
                        <p className="label-muted">What the numbers mean</p>
                        <p className="body-lg mt-3 measure-tight">
                            {STUDY.resultNote}
                        </p>
                    </Reveal>
                </div>
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

                    <FigureGallery
                        figures={figures}
                        idPrefix="gait"
                        ariaLabel="Gait recognition figures"
                    />
                </div>
            </div>

            {/* Gallery 2 and the interactive pipeline are depth, not the
                headline — they render on the /work route only. The home zone
                stops at intro / how / results / figures. */}
            {!brief && (
            <>
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

            {/* ═══════════ INTERACTIVE PIPELINE ═══════════
                Sits directly after the input strip: the reader has just seen
                the three silhouettes, and this shows what the pipeline does
                to them — computed live from those same three files. */}
            <div className="mt-24 md:mt-32">
                <GaitPipeline />
            </div>
            </>
            )}

            {/* ═══════════ DATASET NOTE + STACK + CTAs ═══════════ */}
            <div className="section-container">
                <Reveal
                    stagger={0.08}
                    className="mt-20 md:mt-24 flex flex-col items-start gap-8"
                >
                    {!brief && (
                        <p
                            data-reveal-child
                            className="body-sm max-w-2xl text-tertiary"
                        >
                            Gait recognition is a young field with few open
                            datasets. CASIA-B remains one of the only public
                            benchmarks offering controlled cross-view and
                            covariate coverage, which bounds how far occlusion
                            performance can be pushed without collecting new
                            data.
                        </p>
                    )}

                    <p
                        data-reveal-child
                        className="mono text-xs text-tertiary leading-relaxed"
                    >
                        {techStack.join("  ·  ")}
                    </p>

                    <div data-reveal-child>
                        <CtaRow
                            ctas={[
                                { label: "View on GitHub", href: REPO, primary: true, external: true },
                                { label: "GaitSet Paper", href: GAITSET_PAPER, external: true },
                                { label: "Fusion Paper", href: FUSION_PAPER, external: true },
                            ]}
                            readMoreHref={brief ? "/work/gait-multi-modal-fusion" : undefined}
                        />
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
