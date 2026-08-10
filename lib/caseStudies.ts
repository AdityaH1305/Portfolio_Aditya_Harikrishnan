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
    },
];

export function caseStudyByPath(pathname: string): CaseStudy | undefined {
    return CASE_STUDIES.find((c) => pathname === `/work/${c.slug}`);
}
