"use client";

import Reveal from "@/components/Reveal";

/* ══════════════════════════════════════════════════════
   Stack — evidence-linked

   Was five columns of bare nouns, and it had gone stale:
   no PyTorch, NumPy or OpenCV despite two computer-vision
   case studies built on them.

   Every entry now names where it was actually used. A list
   anyone could copy becomes a list only this portfolio can
   make, and an interviewer gets a question to ask rather
   than a claim to take on faith.

   `where` is drawn from each project's own techStack array.
   Anything used but not yet shipped in a case study is left
   out — an unbacked entry undoes the point of the section.

   id="stack" is required: SideNav and the atlas both index
   against it.
   ══════════════════════════════════════════════════════ */

interface Entry {
    name: string;
    where: string;
}

const groups: { category: string; note: string; entries: Entry[] }[] = [
    {
        category: "Machine Learning",
        note: "Two vision systems and a recommender, each measured against a baseline.",
        entries: [
            { name: "PyTorch", where: "Gait Fusion" },
            { name: "Transfer Learning", where: "Modified Double U-Net" },
            { name: "Triplet Loss", where: "Gait Fusion" },
            { name: "Xception · VGG-19", where: "Modified Double U-Net" },
            { name: "Collaborative Filtering", where: "Ludex" },
            { name: "Content-Based Filtering", where: "Ludex" },
            { name: "Implicit ALS · TF-IDF", where: "Ludex" },
            { name: "Scikit-learn", where: "Ludex" },
        ],
    },
    {
        category: "Computer Vision",
        note: "Silhouette preprocessing, lesion segmentation, damage detection.",
        entries: [
            { name: "OpenCV", where: "Gait Fusion" },
            { name: "NumPy", where: "Gait Fusion" },
            { name: "Semantic Segmentation", where: "Modified Double U-Net" },
            { name: "YOLO Detection", where: "SynthRescue" },
        ],
    },
    {
        category: "Systems & Backend",
        note: "The parts that had to survive real usage.",
        entries: [
            { name: "Python", where: "Every project" },
            { name: "Flask · Node.js", where: "Ludex · PlayNexus" },
            { name: "Real-time APIs", where: "PlayNexus" },
            { name: "Java · C · C++", where: "Coursework" },
        ],
    },
    {
        category: "Frontend",
        note: "Interfaces for the systems above, including this site.",
        entries: [
            { name: "TypeScript", where: "This portfolio" },
            { name: "React · Next.js", where: "PlayNexus · SynthRescue" },
            { name: "GSAP · Lenis", where: "This portfolio" },
            { name: "Tailwind CSS", where: "This portfolio" },
        ],
    },
    {
        category: "Data",
        note: "Storage and the datasets the models were trained on.",
        entries: [
            { name: "MySQL · MongoDB", where: "PlayNexus · Ludex" },
            { name: "CASIA-B", where: "Gait Fusion" },
            { name: "BUSI", where: "Modified Double U-Net" },
        ],
    },
    {
        category: "Fundamentals",
        note: "Coursework at IIIT Pune.",
        entries: [
            { name: "Data Structures · Algorithms", where: "" },
            { name: "Operating Systems", where: "" },
            { name: "DBMS · Computer Networks", where: "" },
            { name: "Cryptography", where: "" },
        ],
    },
];

export default function Skills() {
    return (
        <section id="stack" className="section-y section-divide">
            <div className="section-container">
                <Reveal y={12}>
                    <p className="label">06 / Stack</p>
                    <h2 className="heading-lg mt-3">Skills &amp; Tools</h2>
                    <p className="body-lg mt-5 measure-tight">
                        Listed against the work that used them, not as a
                        checklist.
                    </p>
                </Reveal>

                <Reveal
                    stagger={0.06}
                    className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12"
                >
                    {groups.map((group) => (
                        <div key={group.category} data-reveal-child>
                            <h3 className="label">{group.category}</h3>
                            <p className="body-sm text-tertiary mt-2 mb-5">
                                {group.note}
                            </p>

                            <dl className="border-t border-edge">
                                {group.entries.map((entry) => (
                                    <div
                                        key={entry.name}
                                        className="flex items-baseline justify-between gap-4
                                                   py-2.5 border-b border-edge"
                                    >
                                        <dt className="text-sm text-secondary">
                                            {entry.name}
                                        </dt>
                                        {entry.where && (
                                            <dd className="mono text-[0.6875rem] text-quaternary text-right shrink-0">
                                                {entry.where}
                                            </dd>
                                        )}
                                    </div>
                                ))}
                            </dl>
                        </div>
                    ))}
                </Reveal>
            </div>
        </section>
    );
}
