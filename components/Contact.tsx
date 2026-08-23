"use client";

import Reveal from "@/components/Reveal";
import MagneticLink from "@/components/MagneticLink";

/* ══════════════════════════════════════════════════════
   Contact Section

   The only centered section on the page — that is what
   makes it read as the terminus.
   ══════════════════════════════════════════════════════ */

/**
 * The footer's meta items, in order.
 *
 * A list rather than four hand-written spans so the separators between them
 * are generated and can never be authored into the copy by accident — the
 * previous version had its one middle dot living inside a string, which is
 * how a screen reader ends up reading punctuation aloud.
 *
 * The uplink line is deliberately NOT here: it carries a `<kbd>` element
 * rather than a string, and widening this to `ReactNode` to accommodate one
 * entry would make the simple case carry the complicated one's weight.
 */
const META = [
    { label: "Status: Available" },
    { label: "Focus: ML Systems" },
    { label: "Built with Next.js + TypeScript" },
] as const;

export default function Contact() {
    return (
        <section
            id="contact"
            className="relative section-y section-divide"
        >
            <div className="section-container">
                <div className="flex flex-col items-center text-center">
                    {/* ── Heading — personal, distinctive ── */}
                    <Reveal y={20} duration={0.6}>
                        <p className="label">Contact</p>
                        <h2 className="heading-lg mt-3">
                            Interested in building
                            <br />
                            <span className="text-accent">
                                something meaningful?
                            </span>
                        </h2>
                        <p className="body-lg mt-7 max-w-md mx-auto">
                            Open to internships, research collaborations,
                            <br />
                            and ambitious projects.
                        </p>
                    </Reveal>

                    {/* ── Contact Links ── */}
                    <Reveal
                        y={12}
                        duration={0.45}
                        delay={0.1}
                        className="mt-14 flex flex-col sm:flex-row gap-4"
                    >
                        <MagneticLink
                            href="mailto:adityaharikrishnan@gmail.com"
                            className="btn-primary"
                        >
                            Email Me
                        </MagneticLink>

                        <MagneticLink
                            href="https://github.com/AdityaH1305"
                            external
                            className="btn-secondary"
                        >
                            GitHub
                        </MagneticLink>

                        <MagneticLink
                            href="https://www.linkedin.com/in/aditya-harikrishnan-3932192a4/"
                            external
                            className="btn-secondary"
                        >
                            LinkedIn
                        </MagneticLink>
                    </Reveal>
                </div>
            </div>

            {/* ── Footer ──
                Left-aligned and width-capped rather than a full-width
                justify-between row. The LivingArchitecture atlas draws in the
                right 48% of the viewport (from x = 0.52·vw), and the old
                layout pushed "Built with Next.js…" to the container's right
                edge — x 876–1129 on a 1280px screen, right through the
                branches. max-w-sm keeps the whole block clear of that
                boundary from 1024px upward, and on mobile the atlas stops at
                90% viewport height so the footer sits below it either way. */}
            <footer className="mt-16 pt-8">
                <div className="section-container">
                    <div className="max-w-sm pb-10">
                        {/* ── A CONSISTENT VERTICAL LIST ──
                            These are four items of the same kind — status,
                            focus, stack, telemetry — and they used to be laid
                            out as three different things: a two-item wrap row,
                            then an orphaned line, then a `.signal-strip` line.
                            Same weight, same colour, same size, three
                            different arrangements, which is what made the
                            block read as unfinished.

                            A SINGLE SEPARATED ROW WAS TRIED FIRST AND IS
                            WRONG HERE. This block is capped at `max-w-sm`
                            (384px) to clear the atlas — see the note above —
                            against roughly 810px of content, so a row wraps at
                            EVERY viewport, not merely narrow ones. Measured at
                            320px it broke to four lines with an interpunct
                            dangling at the start of each, which is worse than
                            no separator at all.

                            So: one item per line, one even gap, and no
                            separators — the line breaks already do that job.
                            `gap-2` rather than the old `gap-2.5` because 12px
                            uppercase mono at 0.14em tracking wants an even
                            rhythm rather than a tight one. */}
                        <ul className="flex flex-col gap-2">
                            {META.map((item) => (
                                <li key={item.label} className="label-muted">
                                    {item.label}
                                </li>
                            ))}

                            {/* Telemetry, and the only place the site admits
                                the command palette exists. Deliberately reads
                                as an instrument line rather than an
                                instruction: anyone who tries the shortcut
                                finds a list, and one entry in that list is not
                                documentation.

                                Its own item rather than a `META` entry because
                                it carries an element, not a string.

                                NO ALIGNMENT UTILITY HERE. `.signal-strip`
                                already sets `align-items: center`, and it is
                                declared after Tailwind's utilities in
                                globals.css — so an `items-baseline` here loses
                                at equal specificity and silently does nothing,
                                the same trap `.section-container` documents for
                                `mt-*`. Centring is also the right answer: the
                                keycap is 23px against ~17px of type, and
                                baseline-aligning a bordered box to running text
                                hangs it low. */}
                            <li className="label-muted signal-strip">
                                Uplink nominal
                                <kbd className="keycap">Ctrl K</kbd>
                            </li>
                        </ul>

                        {/* A rule, not just a margin. The meta row above is
                            the same 12px mono as everything else in this
                            block, so without a hairline the copyright reads
                            as a fifth meta item rather than as the end of the
                            page. */}
                        <p className="text-xs text-tertiary mt-5 pt-5 border-t border-edge">
                            © {new Date().getFullYear()} Aditya Harikrishnan
                        </p>
                    </div>
                </div>
            </footer>
        </section>
    );
}