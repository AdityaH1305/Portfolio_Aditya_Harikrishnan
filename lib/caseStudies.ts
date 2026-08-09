/* ══════════════════════════════════════════════════════
   Case-study registry

   One source for the three things that used to be restated
   per component: the slug, the headline claim, and the cover.

   Three consumers, which is why it is a module and not props:
     • FeaturedWork  — the home index cards
     • CaseStudyChrome — the route header, which only knows a
       pathname and has to recover the title from it
     • CommandPalette — route entries

   Every number here is copied from the case study it links
   to. If one changes there, change it here: two numbers that
   disagree cost more credibility than either one buys.
   ══════════════════════════════════════════════════════ */

export interface CaseStudy {
    slug: string;
    /** Eyebrow — matches the tag inside the case study itself. */
    tag: string;
    title: string;
    /** Affiliation line. Only Gait has one. */
    context?: string;
    /** One sentence: what it is and why it is interesting. */
    thesis: string;
    metric: string;
    metricLabel: string;
    cover: { src: string; w: number; h: number; alt: string };
    stack: string[];
}

export const CASE_STUDIES: CaseStudy[] = [
    {
        slug: "gait-multi-modal-fusion",
        tag: "Gait Biometrics / Computer Vision",
        title: "Gait Recognition via Multi-Modal Fusion",
        context: "ISRO · Liquid Propulsion Systems Centre",
        thesis:
            "Cross-view gait recognition that treats a walk as an unordered set of silhouettes, extended with a multi-modal fusion branch so identity survives dropped frames, changed angles and occlusion.",
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
    },
    {
        slug: "ludex",
        tag: "Recommendation Systems",
        title: "Ludex",
        thesis:
            "A hybrid recommendation engine fusing content-based and collaborative signals into one ranking, measured honestly against the baseline it replaces.",
        metric: "+27%",
        metricLabel: "Precision@20 over baseline",
        cover: {
            src: "/projects/dashboard-poster.webp",
            w: 1280,
            h: 720,
            alt: "The Ludex dashboard showing ranked game recommendations.",
        },
        stack: ["Python", "TF-IDF", "Implicit ALS", "Scikit-learn"],
    },
    {
        slug: "modified-double-unet",
        tag: "Medical Imaging / Deep Learning",
        title: "Modified Double U-Net",
        thesis:
            "An implementation of the Deb & Jha Xception-VGG Double U-Net, extended to ternary segmentation that separates benign from malignant lesions rather than just foreground from background.",
        metric: "95.94%",
        metricLabel: "Mean IoU · 1.58 pts over baseline",
        cover: {
            src: "/mod-dun/ModelArchitectureDiagram.avif",
            w: 1920,
            h: 282,
            alt: "The modified Double U-Net architecture: an Xception encoder feeding a first U-Net, whose output multiplies the input into a second VGG-based U-Net with ASPP bridges.",
        },
        stack: ["Python", "Xception", "VGG-19", "BUSI"],
    },
];

export function caseStudyByPath(pathname: string): CaseStudy | undefined {
    return CASE_STUDIES.find((c) => pathname === `/work/${c.slug}`);
}
