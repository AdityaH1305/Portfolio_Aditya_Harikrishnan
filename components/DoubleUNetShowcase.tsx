"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { useTabUnderline } from "@/lib/useTabUnderline";

/* ══════════════════════════════════════════════════════
   DoubleUNetShowcase — Featured Work, project 02

   Full-width media band rather than Ludex's sticky split:
   these figures are panoramic (the architecture diagram is
   6.8:1, the segmentation strips 5.2:1), so in a ~500px
   sticky rail the diagram would render ~73px tall and be
   unreadable. They need the whole measure.

   Attribution note — the architecture is NOT original work.
   It is Deb & Jha (IEEE TRPMS 2023); the contribution here
   is implementing it and extending it past the paper's
   binary task to ternary segmentation across two breast
   imaging modalities. The copy says so explicitly, because
   the paper is trivially findable by title.
   ══════════════════════════════════════════════════════ */

const PAPER_DOI = "https://doi.org/10.1109/TRPMS.2022.3221471";
const REPO = "https://github.com/AdityaH1305/Modified_DoubleUNet_Implementation";
const REPORT = "/modified-double-unet-report.pdf";

/** Binary segmentation, all three trained and evaluated on the same data. */
const baseline = [
    { model: "U-Net", params: "9M", iou: "86.15%", dice: "92.56%" },
    { model: "Double U-Net", params: "24M", iou: "94.36%", dice: "97.10%" },
    {
        model: "Modified Double U-Net",
        params: "23M",
        iou: "95.94%",
        dice: "97.93%",
        ours: true,
    },
];

/** The ternary extension — the part that goes beyond the source paper. */
const ternary = [
    {
        dataset: "BUSI",
        modality: "Ultrasound",
        iou: "77.77%",
        dice: "82.84%",
    },
    {
        dataset: "CBIS-DDSM",
        modality: "Mammography",
        iou: "59.23%",
        dice: "73.37%",
    },
];

const narrative = [
    {
        title: "The Problem",
        body: "A binary lesion mask tells a clinician where tissue is abnormal, but not what kind. Separating benign from malignant in the same pass is materially harder — the classes are visually similar, irregularly shaped, and heavily outnumbered by background.",
    },
    {
        title: "The Approach",
        body: "Two U-Nets stacked, where the second refines the first's mask rather than starting over. The first encoder is an ensemble of ImageNet-pretrained VGG-19, Xception and DenseNet, so the model reads rich features from a small medical dataset. The output head was extended from two classes to three.",
    },
    {
        title: "The Result",
        body: "Higher IoU than both baselines on binary segmentation, with fewer parameters than Double U-Net. The ternary extension holds up on ultrasound and degrades measurably on mammography — a gap worth naming rather than hiding.",
    },
];

/* Figures are wide, so each carries a min width and pans horizontally on
   small screens instead of shrinking into illegibility. */
const figures: {
    id: string;
    label: string;
    minW: string;
    images: { src: string; w: number; h: number; alt: string }[];
}[] = [
    {
        id: "segmentation",
        label: "Segmentation",
        minW: "min-w-[420px]",
        images: [
            {
                src: "/mod-dun/High-PrecisionMedicalImageSegmentationusingaHybridXception-VGGDoubleUNet.avif",
                w: 1600,
                h: 1000,
                alt: "Breast ultrasound scans showing benign and malignant lesions alongside their predicted segmentation masks and colour-coded overlays marking the detected lesion regions.",
            },
        ],
    },
    {
        id: "architecture",
        label: "Architecture",
        minW: "min-w-[860px]",
        images: [
            {
                src: "/mod-dun/ModelArchitectureDiagram.avif",
                w: 1920,
                h: 282,
                alt: "Architecture diagram of the modified Double U-Net: an ensemble encoder feeding a first U-Net, whose output mask is refined by a second stacked U-Net.",
            },
        ],
    },
    {
        id: "per-class",
        label: "Per-class output",
        minW: "min-w-[620px]",
        images: [
            {
                src: "/mod-dun/BenignLesionSegmentation_Jaccard-0.avif",
                w: 1320,
                h: 256,
                alt: "Benign lesion segmentation: input ultrasound, ground-truth mask and model prediction shown side by side.",
            },
            {
                src: "/mod-dun/MalignantLesionSegmentation_Jaccard-0.avif",
                w: 1320,
                h: 256,
                alt: "Malignant lesion segmentation: input ultrasound, ground-truth mask and model prediction shown side by side.",
            },
        ],
    },
    {
        id: "training",
        label: "Training",
        minW: "min-w-[700px]",
        images: [
            {
                src: "/mod-dun/BUSITrainingandValidationCurves.avif",
                w: 1920,
                h: 800,
                alt: "Training and validation curves on the BUSI dataset across epochs.",
            },
        ],
    },
];

const techStack = [
    "Python",
    "VGG-19",
    "Xception",
    "DenseNet",
    "Transfer Learning",
    "Adam",
    "Dice / Cross-Entropy Loss",
];

/* ══════════════════════════════════════════════════════ */

export default function DoubleUNetShowcase() {
    const [activeFigure, setActiveFigure] = useState(0);
    const { rowRef, tabRefs, underlineRef } = useTabUnderline(activeFigure);

    const figure = figures[activeFigure];

    return (
        <article>
            {/* ═══════════ HEADER ═══════════ */}
            <div className="section-container">
                <Reveal stagger={0.08}>
                    <p data-reveal-child className="label-muted">
                        Medical Imaging / Deep Learning
                    </p>
                    <h2 data-reveal-child className="heading-xl mt-4">
                        Modified Double U-Net
                    </h2>
                    <p data-reveal-child className="body-lg mt-6 max-w-2xl">
                        An implementation of the modified Double U-Net{" "}
                        <a
                            href={PAPER_DOI}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-accent text-primary"
                        >
                            (Deb &amp; Jha, IEEE TRPMS 2023)
                        </a>
                        , extended past the paper&apos;s binary task to ternary
                        segmentation — separating background, benign and
                        malignant lesions across breast ultrasound and
                        mammography.
                    </p>
                </Reveal>

                {/* ═══════════ HEADLINE METRIC + EVIDENCE ═══════════
                    The number and the table it rests on, together: a bare
                    percentage is unverifiable, the comparison is the result. */}
                <div className="mt-14 md:mt-20 grid lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] gap-12 lg:gap-16 items-start">
                    <Reveal y={28} duration={0.8}>
                        <span className="ludex-hero-metric">95.94%</span>
                        <p className="text-base md:text-lg text-secondary max-w-[22rem] leading-snug mt-2">
                            Mean IoU on binary segmentation — 1.58 points above
                            the Double U-Net baseline, with fewer parameters.
                        </p>
                    </Reveal>

                    <Reveal y={20} duration={0.6} delay={0.1}>
                        <table className="w-full text-left border-collapse">
                            <caption className="label-muted normal-case tracking-normal text-left mb-4">
                                Binary segmentation · same data, same split
                            </caption>
                            <thead>
                                <tr className="border-b border-edge-default">
                                    <th className="label-muted font-normal py-2 pr-4">
                                        Model
                                    </th>
                                    <th className="label-muted font-normal py-2 pr-4 text-right">
                                        Params
                                    </th>
                                    <th className="label-muted font-normal py-2 pr-4 text-right">
                                        IoU
                                    </th>
                                    <th className="label-muted font-normal py-2 text-right">
                                        Dice
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {baseline.map((row) => (
                                    <tr
                                        key={row.model}
                                        className="border-b border-edge"
                                    >
                                        <td
                                            className={`py-3 pr-4 text-sm ${
                                                row.ours
                                                    ? "text-accent font-semibold"
                                                    : "text-secondary"
                                            }`}
                                        >
                                            {row.model}
                                        </td>
                                        <td className="py-3 pr-4 text-sm mono text-tertiary text-right">
                                            {row.params}
                                        </td>
                                        <td
                                            className={`py-3 pr-4 text-sm mono text-right ${
                                                row.ours
                                                    ? "text-accent font-semibold"
                                                    : "text-secondary"
                                            }`}
                                        >
                                            {row.iou}
                                        </td>
                                        <td
                                            className={`py-3 text-sm mono text-right ${
                                                row.ours
                                                    ? "text-accent font-semibold"
                                                    : "text-secondary"
                                            }`}
                                        >
                                            {row.dice}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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

            {/* ═══════════ MEDIA — full measure ═══════════ */}
            <div className="section-container">
                <div className="mt-20 md:mt-28">
                    {/* Tab row. rowRef must stay relative and be the direct
                        offsetParent of the buttons — the underline tween reads
                        btn.offsetLeft. */}
                    <div
                        ref={rowRef}
                        role="tablist"
                        aria-label="Modified Double U-Net figures"
                        className="flex flex-wrap gap-6 mb-5 relative"
                    >
                        {figures.map((f, i) => (
                            <button
                                key={f.id}
                                ref={(el) => {
                                    tabRefs.current[i] = el;
                                }}
                                role="tab"
                                id={`dun-tab-${f.id}`}
                                aria-selected={activeFigure === i}
                                aria-controls={`dun-panel-${f.id}`}
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
                            {/* Only the active figure renders. The aspect
                                ratios span 1.6:1 to 6.8:1, so stacking them
                                in one box would leave the flat diagrams
                                floating in ~450px of dead space. */}
                            <div
                                role="tabpanel"
                                id={`dun-panel-${figure.id}`}
                                aria-labelledby={`dun-tab-${figure.id}`}
                                className="overflow-x-auto"
                            >
                                <div
                                    className={`${figure.minW} flex flex-col gap-3 p-3`}
                                >
                                    {figure.images.map((img) => (
                                        <Image
                                            key={img.src}
                                            src={img.src}
                                            alt={img.alt}
                                            width={img.w}
                                            height={img.h}
                                            sizes="(max-width: 768px) 100vw, 940px"
                                            className="w-full h-auto block rounded-lg"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════ TERNARY EXTENSION + LIMITS ═══════════ */}
            <div className="section-container">
                <div className="mt-20 md:mt-28 grid lg:grid-cols-2 gap-14 lg:gap-16 items-start">
                    <Reveal y={20}>
                        <h3 className="heading-sm">
                            Extending it to three classes
                        </h3>
                        <p className="body-sm mt-3 max-w-lg">
                            The source paper evaluates on binary tasks only.
                            Extending the output head to background, benign and
                            malignant produced these results across two
                            modalities:
                        </p>

                        <div className="mt-8 flex flex-col gap-6">
                            {ternary.map((t) => (
                                <div
                                    key={t.dataset}
                                    className="flex flex-wrap items-baseline gap-x-5 gap-y-1 pb-4 border-b border-edge"
                                >
                                    <span className="text-sm font-semibold text-primary min-w-[7.5rem]">
                                        {t.dataset}
                                    </span>
                                    <span className="label-muted">
                                        {t.modality}
                                    </span>
                                    <span className="ml-auto mono text-sm text-secondary">
                                        IoU {t.iou}
                                    </span>
                                    <span className="mono text-sm text-secondary">
                                        Dice {t.dice}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Reveal>

                    {/* Naming the weakness is the point — it is the honest
                        reading of the per-class numbers in the report. */}
                    <Reveal y={20} delay={0.1}>
                        <h3 className="heading-sm">Where it falls short</h3>
                        <p className="body-sm mt-3 max-w-lg">
                            Malignant lesions are the hardest class — Dice 0.46,
                            IoU 0.39 — because their boundaries are irregular
                            and infiltrative and the class is heavily
                            outnumbered. The high mean scores are partly carried
                            by the dominant background class, which reaches Dice
                            0.98 on its own.
                        </p>
                        <p className="body-sm mt-4 max-w-lg">
                            The next step is class balancing: weighted loss
                            functions and targeted oversampling, so the metric
                            reflects lesion quality rather than background area.
                        </p>
                    </Reveal>
                </div>
            </div>

            {/* ═══════════ STACK + CTAs ═══════════ */}
            <div className="section-container">
                <Reveal
                    stagger={0.08}
                    className="mt-20 md:mt-24 flex flex-col items-start gap-8"
                >
                    <p
                        data-reveal-child
                        className="mono text-xs text-tertiary leading-relaxed"
                    >
                        {techStack.join("  ·  ")}
                    </p>

                    <div data-reveal-child>
                        <div className="flex flex-wrap gap-4">
                            <a
                                href={REPORT}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                            >
                                Read the Report
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
                                href={REPO}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                            >
                                View on GitHub
                            </a>
                            <a
                                href={PAPER_DOI}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                            >
                                Source Paper
                            </a>
                        </div>
                        <p className="label-muted mt-4 normal-case tracking-normal">
                            PDF · 2.9 MB
                        </p>
                    </div>
                </Reveal>
            </div>
        </article>
    );
}
