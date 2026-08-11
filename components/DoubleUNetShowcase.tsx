"use client";

import Reveal from "@/components/Reveal";
import FigureGallery, { type Figure } from "@/components/FigureGallery";
import CtaRow from "@/components/CtaRow";
import { CASE_STUDIES } from "@/lib/caseStudies";

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

/* Still here because the deck links to the source paper inline. The repo and
   paper CTAs moved to the registry, where the home-page stage reads them too. */
const PAPER_DOI = "https://doi.org/10.1109/TRPMS.2022.3221471";

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

/* One figure per tab, so the gallery's prev/next reaches every image.
   `minW` marks the wide ones, which pan horizontally on small screens.
   `maxVh` caps a figure's height as a fraction of the viewport. */
const figures: Figure[] = [
    {
        id: "segmentation",
        label: "Segmentation",
        // No maxVh override: this was the tallest figure here, so capping it
        // above the gallery default only stretched the shared frame and
        // stranded the wide architecture strip in empty space.
        minW: "max-md:min-w-[560px]",
        caption:
            "Ultrasound scans with predicted masks and colour-coded overlays marking the detected lesion regions.",
        src: "/mod-dun/High-PrecisionMedicalImageSegmentationusingaHybridXception-VGGDoubleUNet.avif",
        w: 1600,
        h: 1000,
        alt: "Breast ultrasound scans showing benign and malignant lesions alongside their predicted segmentation masks and colour-coded overlays marking the detected lesion regions.",
    },
    {
        id: "architecture",
        label: "Architecture",
        minW: "max-md:min-w-[860px]",
        caption:
            "Two stacked U-Nets: an ensemble encoder feeds the first, whose mask the second refines.",
        src: "/mod-dun/ModelArchitectureDiagram.avif",
        w: 1920,
        h: 282,
        alt: "Architecture diagram of the modified Double U-Net: an ensemble encoder feeding a first U-Net, whose output mask is refined by a second stacked U-Net.",
    },
    {
        id: "training",
        label: "Training",
        minW: "max-md:min-w-[700px]",
        caption:
            "Training and validation curves on the BUSI dataset across epochs.",
        src: "/mod-dun/BUSITrainingandValidationCurves.avif",
        w: 1920,
        h: 800,
        alt: "Training and validation curves on the BUSI dataset across epochs.",
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

const STUDY = CASE_STUDIES[2];

export default function DoubleUNetShowcase() {
    return (
        <article>
            {/* Eyebrow and title live in CaseStudyHero — this is a route
                now, so that block owns the page's <h1>. */}
            <div className="section-container">
                <Reveal y={20}>
                    <p className="body-lg measure">{STUDY.intro}</p>
                    <p className="body-lg measure mt-6">{STUDY.how}</p>
                    <p className="body-sm measure mt-5 text-tertiary">
                        Built on the architecture in{" "}
                        <a
                            href={PAPER_DOI}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-accent text-secondary"
                        >
                            Deb &amp; Jha, IEEE TRPMS 2023
                        </a>
                        .
                    </p>
                </Reveal>

                {/* ═══════════ HEADLINE METRIC + EVIDENCE ═══════════
                    The number and the table it rests on, together: a bare
                    percentage is unverifiable, the comparison is the result. */}
                <div className="mt-14 md:mt-20 grid lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] gap-12 lg:gap-16 items-start">
                    {/* Display numeral moved to CaseStudyHero; the number and
                        the table it rests on still sit together, which was
                        always the point of this pairing. */}
                    <Reveal y={28} duration={0.8}>
                        <p className="label-muted">What the numbers mean</p>
                        <p className="body-lg mt-3 measure-tight">
                            {STUDY.resultNote}
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

            </div>

            {/* ═══════════ MEDIA — full measure ═══════════ */}
            <div className="section-container">
                <div className="mt-20 md:mt-28">
                    <FigureGallery
                        figures={figures}
                        idPrefix="dun"
                        ariaLabel="Modified Double U-Net figures"
                    />
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

                    {/* Links come from the registry — the stage on the home
                        page renders this same row from the same data. */}
                    <div data-reveal-child>
                        <CtaRow ctas={STUDY.ctas} />
                    </div>
                </Reveal>
            </div>
        </article>
    );
}
