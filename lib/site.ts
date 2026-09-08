/* ══════════════════════════════════════════════════════
   The site's own identity

   One copy of every string that describes *this site* rather
   than any component in it: where it lives, who it is, and
   the handful of URLs that point back at him.

   ── Why this is a module and not consts in layout.tsx ──
   `lib/socialCard.ts` exists for exactly this reason and
   states it plainly: a value more than one file needs, kept
   in one place so the copies cannot drift. This one had
   drifted before it was written.

   `SITE_URL` was a private, non-exported const in
   app/layout.tsx, and `app/sitemap.ts`, `app/robots.ts` and
   `lib/structuredData.ts` all need it — a sitemap that
   disagrees with `metadataBase` by one character is a
   Search Console "Duplicate, submitted URL not selected as
   canonical" and nothing on the page looks wrong.

   `RESUME_URL` was worse: the SAME Google Drive string
   written out three times, in SideNav.tsx, Hero.tsx and
   CommandPalette.tsx. Three places to remember when the CV
   moves, and two of them fail silently — a stale Drive link
   404s for the reader and nobody else ever clicks it.

   ── Consumers ──
   app/layout.tsx · app/sitemap.ts · app/robots.ts
   lib/structuredData.ts · components/SideNav.tsx
   components/Hero.tsx · components/CommandPalette.tsx
   components/Contact.tsx · components/Telemetry.tsx

   ── IT MUST NEVER BECOME A CLIENT MODULE ──
   No `"use client"`, no React import, no DOM access, no
   `Date.now()`. `app/sitemap.ts` and `app/robots.ts` are
   route handlers and `app/layout.tsx` is a server component;
   `components/Telemetry.tsx` is a client component. This
   file is importable from both sides only because it is
   inert. Adding one browser API here breaks the build in
   two places at once.
   ══════════════════════════════════════════════════════ */

/**
 * The canonical origin. No trailing slash — `absolute()` and every
 * `${SITE_URL}/…` template below assume that.
 *
 * ── Overridable, so a custom domain is one env var ──
 * Set `NEXT_PUBLIC_SITE_URL` in Vercel and redeploy. `NEXT_PUBLIC_*` is
 * INLINED AT BUILD TIME, so setting the variable alone does nothing until the
 * next build — that is the whole cost of the promise, and it is worth stating
 * because "I changed it and nothing happened" is the obvious first symptom.
 *
 * ── Deliberately NOT chained to NEXT_PUBLIC_VERCEL_URL ──
 * That varies per preview deployment. Falling back to it would make every
 * preview build emit preview-host canonicals and preview URLs into the
 * sitemap. A wrong-but-stable canonical is one edit to fix; one that changes
 * per deploy poisons the index with URLs that stop existing.
 */
export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://adityaharikrishnan.vercel.app";

export const SITE_NAME = "Aditya Harikrishnan";

/**
 * The `<title>` and `<meta name="description">` for the site root — and the
 * `name`/`description` of the Person node in lib/structuredData.ts.
 *
 * Here rather than in app/layout.tsx because the JSON-LD must not be able to
 * describe him differently from the meta tags. Two descriptions that disagree
 * is the machine-readable version of the credibility problem
 * lib/caseStudies.ts warns about for its numbers.
 */
export const SITE_TITLE =
    "Aditya Harikrishnan — ML Systems & Full-Stack Engineering";
export const SITE_DESCRIPTION =
    "CS undergrad at IIIT Pune building recommendation systems, data platforms, and applied AI. Ludex: a hybrid recommender with +27% Precision@20 over baseline.";

export const JOB_TITLE = "ML Systems & Full-Stack Engineer";
export const SCHOOL_NAME =
    "Indian Institute of Information Technology, Pune";
export const SCHOOL_URL = "https://www.iiitp.ac.in/";

export const EMAIL = "adityaharikrishnan@gmail.com";
export const GITHUB_URL = "https://github.com/AdityaH1305";
export const LINKEDIN_URL =
    "https://www.linkedin.com/in/aditya-harikrishnan-3932192a4/";

/** The CV. Was written out three times; see the header. */
export const RESUME_URL =
    "https://drive.google.com/file/d/1vzrKEpDGGLUcU3jRtCm9lk6MLR7-7NG-/view?usp=sharing";

/**
 * GA4 measurement ID, or `""`.
 *
 * `""` and never `undefined`, so every consumer's guard is one shape —
 * `if (GA_ID)`. With it empty the site renders no GA script, registers no GA
 * sink and logs no warning: local development with nothing configured is
 * fully functional, which is the state this repo is checked out in.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

/**
 * `--surface-0`, the page ground, for the consumers that cannot read CSS.
 *
 * ── THIS REDUCES THE COPIES, IT DOES NOT ADD ONE ──
 * app/layout.tsx used to write this hex TWICE as a literal — once for
 * `viewport.themeColor` and once for the inline `<html>` background that
 * covers the pre-stylesheet paint — and its own comment said all copies must
 * move together. Adding a manifest would have made four. There are now two:
 * this constant, and `--surface-0` in globals.css, which cannot import
 * TypeScript.
 */
export const SURFACE_0 = "#1B262C";

/** `--text-primary`. Paired with SURFACE_0 wherever a token is unreachable. */
export const ICE = "#BBE1FA";

/**
 * When the HOME page's content last meaningfully changed. ISO `YYYY-MM-DD`.
 *
 * HAND-BUMPED, like `published`/`updated` on each case study, and for the
 * same reason recorded in app/sitemap.ts: a `lastmod` that is always the
 * build clock carries no information, and Google learns to ignore it.
 *
 * Its own constant rather than `max(CASE_STUDIES.updated)` — the home page
 * changes for reasons entirely unrelated to the write-ups (Journey,
 * Experience, the stack section, the entrance), so deriving it from three
 * dates that do not describe it would be wrong in a way nobody would notice.
 */
export const HOME_UPDATED = "2026-09-07";

/**
 * `schema.org/knowsAbout` for the Person node.
 *
 * Hand-written, and deliberately NOT derived from `CATEGORIES` in
 * components/SkillOrbit/data.ts. Two reasons: that would invert the
 * components → lib dependency direction this repo keeps (see CtaRow.tsx on
 * why `Cta` moved down into lib/), and those labels are UI copy —
 * "Fundamentals", "Systems & Backend" — not topics a knowledge graph can do
 * anything with.
 */
export const KNOWS_ABOUT: readonly string[] = [
    "Machine Learning",
    "Computer Vision",
    "Recommendation Systems",
    "Deep Learning",
    "Medical Image Segmentation",
    "Gait Recognition",
    "Full-Stack Development",
    "Python",
];

/**
 * A root-relative path resolved against `SITE_URL`, with exactly one slash
 * between them and no trailing-slash surprises.
 *
 * Pure, and it exists for the failure lib/socialCard.ts already documents:
 * "Scrapers reject relative URLs outright, and the failure is invisible
 * locally — the tag renders, the preview is just blank." Same for a `@id`
 * in JSON-LD and a `<loc>` in a sitemap. Both are read by machines that
 * report nothing when they give up.
 */
export function absolute(path: string): string {
    if (/^https?:\/\//.test(path)) return path;
    return `${SITE_URL}/${path.replace(/^\/+/, "")}`;
}
