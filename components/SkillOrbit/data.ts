/* ══════════════════════════════════════════════════════
   The skill graph

   Lifted out of Skills.tsx so the canvas, the readout and
   the list view all read one source. One field changed
   shape on the way: `where: string` became
   `projects: string[]`.

   That is not tidying. The old field already encoded more
   than one project as a display string — "Ludex · PlayNexus",
   "PlayNexus · SynthRescue" — and the wormhole regroup needs
   a real many-to-many to cluster by. Re-splitting a label on
   " · " at 60fps to recover data we could have stored
   properly is how a separator inside a skill NAME (there are
   several: "Xception · VGG-19", "Implicit ALS · TF-IDF")
   eventually gets parsed as a project.

   ── Two deliberate special cases ──
   `EVERY_PROJECT` — Python, which is true of all of them and
   should therefore be pulled into every regroup rather than
   arbitrarily assigned to one.
   `[]` — the Fundamentals group, which is coursework and has
   no project to travel to. Those bodies stay unlit during a
   regroup, which is honest: they are the one part of this
   section with no shipped evidence behind it.

   ── Keep in step ──
   These claims must agree with each case study's own
   `techStack` array in its showcase component. Hand-
   maintained, exactly as before — a skill here that the case
   study does not list costs more credibility than the entry
   buys. Unifying the two registries is a separate job.
   ══════════════════════════════════════════════════════ */

/** Sentinel for a skill that belongs to every project. */
export const EVERY_PROJECT = "*";

export interface Skill {
    name: string;
    /** Category id. Index into CATEGORIES. */
    category: string;
    /**
     * Projects that prove it. Empty means coursework — no evidence to
     * travel to. `[EVERY_PROJECT]` means all of them.
     */
    projects: string[];
    /** Display string for the readout, preserving the original phrasing. */
    where: string;
}

export interface Category {
    id: string;
    label: string;
    note: string;
}

export const CATEGORIES: Category[] = [
    {
        id: "ml",
        label: "Machine Learning",
        note: "Two vision systems and a recommender, each measured against a baseline.",
    },
    {
        id: "cv",
        label: "Computer Vision",
        note: "Silhouette preprocessing, lesion segmentation, damage detection.",
    },
    {
        id: "sys",
        label: "Systems & Backend",
        note: "The parts that had to survive real usage.",
    },
    {
        id: "fe",
        label: "Frontend",
        note: "Interfaces for the systems above, including this site.",
    },
    {
        id: "data",
        label: "Data",
        note: "Storage and the datasets the models were trained on.",
    },
    {
        id: "core",
        label: "Fundamentals",
        note: "Coursework at IIIT Pune.",
    },
];

/* Project ids. Six of them, which happens to match the category count —
   convenient for the regroup, since the field does not have to change
   density when it re-clusters. */
export const PROJECTS: { id: string; label: string }[] = [
    { id: "gait", label: "Gait Fusion" },
    { id: "dun", label: "Modified Double U-Net" },
    { id: "ludex", label: "Ludex" },
    { id: "playnexus", label: "PlayNexus" },
    { id: "synth", label: "SynthRescue" },
    { id: "site", label: "This portfolio" },
];

export const SKILLS: Skill[] = [
    // ── Machine Learning ──
    { name: "PyTorch", category: "ml", projects: ["gait"], where: "Gait Fusion" },
    { name: "Transfer Learning", category: "ml", projects: ["dun"], where: "Modified Double U-Net" },
    { name: "Triplet Loss", category: "ml", projects: ["gait"], where: "Gait Fusion" },
    { name: "Xception · VGG-19", category: "ml", projects: ["dun"], where: "Modified Double U-Net" },
    { name: "Collaborative Filtering", category: "ml", projects: ["ludex"], where: "Ludex" },
    { name: "Content-Based Filtering", category: "ml", projects: ["ludex"], where: "Ludex" },
    { name: "Implicit ALS · TF-IDF", category: "ml", projects: ["ludex"], where: "Ludex" },
    { name: "Scikit-learn", category: "ml", projects: ["ludex"], where: "Ludex" },

    // ── Computer Vision ──
    { name: "OpenCV", category: "cv", projects: ["gait"], where: "Gait Fusion" },
    { name: "NumPy", category: "cv", projects: ["gait"], where: "Gait Fusion" },
    { name: "Semantic Segmentation", category: "cv", projects: ["dun"], where: "Modified Double U-Net" },
    { name: "YOLO Detection", category: "cv", projects: ["synth"], where: "SynthRescue" },

    // ── Systems & Backend ──
    { name: "Python", category: "sys", projects: [EVERY_PROJECT], where: "Every project" },
    { name: "Flask · Node.js", category: "sys", projects: ["ludex", "playnexus"], where: "Ludex · PlayNexus" },
    { name: "Real-time APIs", category: "sys", projects: ["playnexus"], where: "PlayNexus" },
    { name: "Java · C · C++", category: "sys", projects: [], where: "Coursework" },

    // ── Frontend ──
    { name: "TypeScript", category: "fe", projects: ["site"], where: "This portfolio" },
    { name: "React · Next.js", category: "fe", projects: ["playnexus", "synth"], where: "PlayNexus · SynthRescue" },
    { name: "GSAP · Lenis", category: "fe", projects: ["site"], where: "This portfolio" },
    { name: "Tailwind CSS", category: "fe", projects: ["site"], where: "This portfolio" },

    // ── Data ──
    { name: "MySQL · MongoDB", category: "data", projects: ["playnexus", "ludex"], where: "PlayNexus · Ludex" },
    { name: "CASIA-B", category: "data", projects: ["gait"], where: "Gait Fusion" },
    { name: "BUSI", category: "data", projects: ["dun"], where: "Modified Double U-Net" },

    // ── Fundamentals — coursework, no shipped evidence ──
    { name: "Data Structures · Algorithms", category: "core", projects: [], where: "Coursework" },
    { name: "Operating Systems", category: "core", projects: [], where: "Coursework" },
    { name: "DBMS · Computer Networks", category: "core", projects: [], where: "Coursework" },
    { name: "Cryptography", category: "core", projects: [], where: "Coursework" },
];

/** Does this skill belong to `projectId`? Resolves the EVERY_PROJECT wildcard. */
export function inProject(skill: Skill, projectId: string): boolean {
    if (skill.projects.length === 0) return false;
    return (
        skill.projects.includes(EVERY_PROJECT) ||
        skill.projects.includes(projectId)
    );
}
