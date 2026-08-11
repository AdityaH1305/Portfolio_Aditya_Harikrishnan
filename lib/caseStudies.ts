/* ══════════════════════════════════════════════════════
   Case-study registry

   One source for the three things that used to be restated
   per component: the slug, the headline claim, and the cover.

   Consumers, which is why it is a module and not props:
     • CaseStudyStage — the choreographed home-page stage
     • the three showcases — the /work/* route bodies
     • CaseStudyChrome — the route header, which only knows a
       pathname and has to recover the title from it
     • CredibilityBand · Throughline · CommandPalette

   Every number here is copied from the case study it links
   to. If one changes there, change it here: two numbers that
   disagree cost more credibility than either one buys.
   ══════════════════════════════════════════════════════ */

/**
 * One slide in a stage's media panel.
 *
 * Dimensions are the asset's real intrinsic size — the panel derives its
 * aspect box from them, so a wrong number here shows up as a letterboxed or
 * cropped figure rather than as an error.
 */
export interface MediaSlide {
    type: "image" | "video";
    src: string;
    /**
     * Videos only. Shown while the panel is travelling between beats, so a
     * decode never overlaps a scrubbed transform on the same layer.
     */
    poster?: string;
    w: number;
    h: number;
    alt: string;
    /** One short line naming what is on screen. Read at a glance, mid-scroll. */
    caption: string;
}

/**
 * A button in `CtaRow`.
 *
 * Lives here rather than in the component because the stage and the route
 * body now render the same row from the same data — defining it beside the
 * data keeps the dependency pointing components → lib.
 */
export interface Cta {
    label: string;
    href: string;
    /** Filled treatment. Exactly one per row. */
    primary?: boolean;
    /** Opens in a new tab. PDFs and GitHub, not internal routes. */
    external?: boolean;
}

export interface CaseStudy {
    slug: string;
    /** Eyebrow — matches the tag inside the case study itself. */
    tag: string;
    title: string;
    /** Affiliation line. Only Gait has one. */
    context?: string;
    /** One sentence: what it is and why it is interesting. */
    thesis: string;

    /* ── The three-part read ──
       Everything a visitor needs, in plain language. Written for someone
       who does not know the field: no unexplained jargon, no acronym
       without its meaning. These replaced a Problem/Approach/Result
       narrative that said the same things at twice the length in terms
       only a specialist could parse.

       Every number here already appeared on the site and was checked
       against the source reports in earlier passes. Nothing new is
       claimed — this is a rewrite, not a re-derivation. */

    /** ~2 sentences: what it is, and why the problem is hard. */
    intro: string;
    /** ~3 sentences: how it works, no jargon. */
    how: string;
    /** ~2 sentences: what the number means, including where it fails. */
    resultNote: string;

    metric: string;
    metricLabel: string;
    cover: { src: string; w: number; h: number; alt: string };
    stack: string[];

    /**
     * Slides the stage's media panel crossfades between — one per beat, in
     * beat order. Two or three; the stage clamps, so a study with two slides
     * simply holds the second through its final beat rather than repeating
     * one to pad the array out.
     */
    media: MediaSlide[];

    /**
     * Buttons for this study, rendered by `CtaRow` in both places that show
     * it: the stage's closing beat and the bottom of the /work/* route. They
     * were three separately-maintained inline arrays before.
     */
    ctas: Cta[];
}

export const CASE_STUDIES: CaseStudy[] = [
    {
        slug: "gait-multi-modal-fusion",
        tag: "Gait Biometrics / Computer Vision",
        title: "Gait Recognition via Multi-Modal Fusion",
        context: "ISRO · Liquid Propulsion Systems Centre",
        thesis:
            "Cross-view gait recognition that treats a walk as an unordered set of silhouettes, extended with a multi-modal fusion branch so identity survives dropped frames, changed angles and occlusion.",
        intro:
            "Identifying someone from the way they walk, using a camera that never needs a clear view of their face. The difficulty is that the same person looks completely different from a new angle, in a heavy coat, or when the video drops frames.",
        how:
            "Rather than treating a walk as a video that has to play in order, the model treats it as a loose collection of silhouettes. Frame order stops mattering, so a dropped frame or an uneven walking speed no longer breaks it. A second branch tracks where the body moves most — motion that still shows through when a coat hides the outline.",
        resultNote:
            "98.00% correct identification for normal walking, ahead of the 96.1% published for the method it builds on, on the same dataset. A coat is where it gives ground: accuracy drops to 45.36%. It is also better at ranking a known list of people than at judging whether a stranger belongs to that list at all.",
        metric: "98.00%",
        metricLabel: "Rank-1 · normal walking",
        cover: {
            src: "/gait/architecture.webp",
            w: 912,
            h: 300,
            alt: "Network architecture: silhouette frames enter a per-frame CNN with set pooling, GEI and GEnI templates enter a parallel branch, and both fuse through a horizontal pooling module into a 256-dimensional embedding.",
        },
        stack: ["PyTorch", "OpenCV", "NumPy", "CASIA-B"],
        // Stacks are subsets of each case study's own techStack array.
        // A card that lists a tool the case study doesn't costs credibility.
        media: [
            {
                type: "image",
                src: "/gait/architecture.webp",
                w: 912,
                h: 300,
                alt: "Network architecture: silhouette frames enter a per-frame CNN with set pooling, GEI and GEnI templates enter a parallel branch, and both fuse through a horizontal pooling module into a 256-dimensional embedding.",
                caption: "The two branches, and where they fuse.",
            },
            {
                type: "image",
                src: "/gait/training.webp",
                w: 1501,
                h: 519,
                alt: "Training curves over 150 epochs showing cross-entropy loss and triplet loss decreasing while classification accuracy increases.",
                caption: "150 epochs — both losses falling as accuracy climbs.",
            },
            {
                type: "image",
                src: "/gait/roc-eer.webp",
                w: 1272,
                h: 1131,
                alt: "Receiver operating characteristic curve for open-set gait verification, area under curve 0.5876, with the equal error rate marked at 44.94%.",
                caption: "Open-set verification — where it is weakest.",
            },
        ],
        ctas: [
            {
                label: "View on GitHub",
                href: "https://github.com/AdityaH1305/Gait-Multi-Modal-Fusion",
                primary: true,
                external: true,
            },
            {
                label: "GaitSet Paper",
                href: "/gaitset-cross-view-gait-recognition.pdf",
                external: true,
            },
            {
                label: "Fusion Paper",
                href: "/gaitset-multimodal-fusion.pdf",
                external: true,
            },
        ],
    },
    {
        slug: "ludex",
        tag: "Recommendation Systems",
        title: "Ludex",
        thesis:
            "A hybrid recommendation engine fusing content-based and collaborative signals into one ranking, measured honestly against the baseline it replaces.",
        intro:
            "A recommendation engine for Steam games, built over 57,000 titles and 1,200 players. Most systems either match games by their tags or copy what similar players enjoyed — and each of those fails in exactly the place the other one works.",
        how:
            "Matching by tags can recommend a game released yesterday that nobody has played, but it cannot tell that two very different-looking games appeal to the same person. Learning from play history captures real taste, but it has nothing to say about a game with no players yet. Ludex runs both and blends their rankings into one list.",
        resultNote:
            "27% better than recommending by tags alone, measured on how many of the top 20 suggestions a user actually wanted. Both standalone approaches were evaluated on the same data and the same split, so the comparison is like for like.",
        metric: "+27%",
        metricLabel: "Precision@20 over baseline",
        cover: {
            src: "/projects/dashboard-poster.webp",
            w: 1280,
            h: 720,
            alt: "The Ludex dashboard showing ranked game recommendations.",
        },
        stack: ["Python", "TF-IDF", "Implicit ALS", "Scikit-learn"],
        /* Two slides, not three. The third beat holds this second one rather
           than repeating a poster to pad the array — Ludex has exactly two
           recordings and inventing a third slide would show. */
        media: [
            {
                type: "video",
                src: "/projects/dashboard.mp4",
                poster: "/projects/dashboard-poster.webp",
                w: 1280,
                h: 720,
                alt: "The Ludex dashboard showing ranked game recommendations.",
                caption: "Ranked recommendations, live.",
            },
            {
                type: "video",
                src: "/projects/sign_in.mp4",
                poster: "/projects/sign_in-poster.webp",
                w: 1280,
                h: 720,
                alt: "The Ludex sign-in flow capturing a player profile.",
                caption: "Sign-in, and the profile it builds from.",
            },
        ],
        ctas: [
            /* The report is the strongest artifact here, so it takes primary
               weight rather than the repo. */
            {
                label: "Technical Report",
                href: "/ludex-technical-report.pdf",
                primary: true,
                external: true,
            },
            {
                label: "Visit Site",
                href: "https://ludexsite.onrender.com/",
                external: true,
            },
            {
                label: "View on GitHub",
                href: "https://github.com/AdityaH1305/Ludex",
                external: true,
            },
        ],
    },
    {
        slug: "modified-double-unet",
        tag: "Medical Imaging / Deep Learning",
        title: "Modified Double U-Net",
        thesis:
            "An implementation of the Deb & Jha Xception-VGG Double U-Net, extended to ternary segmentation that separates benign from malignant lesions rather than just foreground from background.",
        intro:
            "Outlining tumours automatically in breast ultrasound scans. Existing models can mark where a lesion is, but not what kind it is — so a clinician still has to make that judgement separately.",
        how:
            "Two networks in sequence: the first draws a rough outline, the second corrects it rather than starting over. Its encoder is pretrained on millions of ordinary photographs, which is what makes it possible to learn from a medical dataset far too small to train from scratch. The output was extended from two labels to three, so benign and malignant are separated in the same pass.",
        resultNote:
            "95.94% overlap with the outline a specialist drew — 1.58 points better than the model it extends, with fewer parameters. The three-way version holds up on ultrasound and measurably degrades on mammography, which is a real limit worth stating rather than a rounding error.",
        metric: "95.94%",
        metricLabel: "Mean IoU · 1.58 pts over baseline",
        cover: {
            src: "/mod-dun/ModelArchitectureDiagram.avif",
            w: 1920,
            h: 282,
            alt: "The modified Double U-Net architecture: an Xception encoder feeding a first U-Net, whose output multiplies the input into a second VGG-based U-Net with ASPP bridges.",
        },
        stack: ["Python", "Xception", "VGG-19", "BUSI"],
        media: [
            {
                type: "image",
                src: "/mod-dun/High-PrecisionMedicalImageSegmentationusingaHybridXception-VGGDoubleUNet.avif",
                w: 1600,
                h: 1000,
                alt: "Breast ultrasound scans showing benign and malignant lesions alongside their predicted segmentation masks and colour-coded overlays marking the detected lesion regions.",
                caption: "Predicted masks against the scans they came from.",
            },
            {
                type: "image",
                src: "/mod-dun/ModelArchitectureDiagram.avif",
                w: 1920,
                h: 282,
                alt: "Architecture diagram of the modified Double U-Net: an ensemble encoder feeding a first U-Net, whose output mask is refined by a second stacked U-Net.",
                caption: "Two U-Nets — the second corrects the first.",
            },
            {
                type: "image",
                src: "/mod-dun/BUSITrainingandValidationCurves.avif",
                w: 1920,
                h: 800,
                alt: "Training and validation curves on the BUSI dataset across epochs.",
                caption: "Training and validation on BUSI.",
            },
        ],
        ctas: [
            /* No report CTA yet, so GitHub takes primary weight — the row
               still needs an anchor. */
            {
                label: "View on GitHub",
                href: "https://github.com/AdityaH1305/Modified_DoubleUNet_Implementation",
                primary: true,
                external: true,
            },
            {
                label: "Source Paper",
                href: "https://doi.org/10.1109/TRPMS.2022.3221471",
                external: true,
            },
        ],
    },
];

export function caseStudyByPath(pathname: string): CaseStudy | undefined {
    return CASE_STUDIES.find((c) => pathname === `/work/${c.slug}`);
}
