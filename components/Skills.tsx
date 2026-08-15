"use client";

import Reveal from "@/components/Reveal";
import SkillOrbit from "@/components/SkillOrbit/SkillOrbit";
import { CATEGORIES, SKILLS } from "@/components/SkillOrbit/data";

/* Imported directly, NOT through `dynamic({ ssr: false })` like the atlas and
   the game modal. Those render nothing until the client catches up, which is
   fine for a background canvas — but this one WRAPS the skills list, so
   deferring it would take all 27 entries out of the server-rendered HTML
   along with it. The canvas work all happens inside effects, so the component
   server-renders perfectly well; only the drawing is client-side. */

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

   ── The list is no longer the whole section ──
   It reads as a wall of 27 name/where pairs, and nobody got
   far enough down it to notice the evidence was there. The
   canvas in components/SkillOrbit/ makes that evidence the
   payoff of an interaction instead — but this list stays,
   server-rendered, as the accessible and keyboard interface
   and as the List view. The data moved to
   SkillOrbit/data.ts so the two cannot disagree.

   id="stack" is required: SideNav and the atlas both index
   against it.
   ══════════════════════════════════════════════════════ */

export default function Skills() {
    return (
        <section id="stack" className="section-y section-divide">
            <div className="section-container">
                <Reveal y={12} className="section-head">
                    <div>
                        <p className="label">Stack</p>
                        <h2 className="heading-lg mt-3">Skills &amp; Tools</h2>
                    </div>
                    <p className="body-lg measure-tight">
                        Listed against the work that used them, not as a
                        checklist.
                    </p>
                </Reveal>

                {/* Vertical rhythm on an inner element — .section-container
                    sets `margin: 0 auto` and is declared after Tailwind's
                    utilities, so an mt-* on it computes to 0px. */}
                <div className="mt-14">
                    <SkillOrbit>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12">
                            {CATEGORIES.map((group) => (
                                <div key={group.id}>
                                    <h3 className="label">{group.label}</h3>
                                    <p className="body-sm text-tertiary mt-2 mb-5">
                                        {group.note}
                                    </p>

                                    <dl className="">
                                        {SKILLS.filter(
                                            (s) => s.category === group.id,
                                        ).map((entry) => (
                                            <div
                                                key={entry.name}
                                                className="flex items-baseline justify-between gap-4
                                                           py-2.5"
                                            >
                                                <dt className="text-sm text-secondary">
                                                    {entry.name}
                                                </dt>
                                                {entry.where && (
                                                    <dd className="mono text-xs text-tertiary text-right shrink-0">
                                                        {entry.where}
                                                    </dd>
                                                )}
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            ))}
                        </div>
                    </SkillOrbit>
                </div>
            </div>
        </section>
    );
}
