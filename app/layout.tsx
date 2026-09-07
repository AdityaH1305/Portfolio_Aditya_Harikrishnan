import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ScrollProvider from "@/components/ScrollProvider";
import { OG_IMAGE } from "@/lib/socialCard";
import {
  GA_ID,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";
import JsonLd from "@/components/JsonLd";
import { personLd, websiteLd } from "@/lib/structuredData";
import RouteScrollReset from "@/components/RouteScrollReset";
import Cursor from "@/components/Cursor";
import Telemetry from "@/components/Telemetry";

/* ── TWO FAMILIES DO THE TEXT NOW, AND THAT REVERSES A DECISION ──
   This comment used to argue for Inter alone, and it named Space Grotesk as
   the face it was rejecting: "its lightest cut is 300, and its letterforms
   assert personality at display sizes where this wants a neutral surface."

   Both halves of that have stopped being true, for different reasons.

   The 300 problem was never about Space Grotesk. It existed because ONE
   family had to serve both 18px lead copy at weight 200 and 76px headlines at
   400, and no display face reaches 200. Inter still owns the body, so the
   constraint still holds — and it now holds against the only family it was
   ever really about.

   The second half was a design judgement that has been overturned on
   purpose: a neutral surface at display sizes is exactly what made the
   headings read as basic. Titles are supposed to assert something. See
   `.display` and the `.heading-*` rungs in globals.css, which are the only
   things that use the display face.

   (Space Grotesk has been here before. `globals.css` carried a
   `--font-space-grotesk` variable that was never defined, so `body` fell
   through to `system-ui` for who knows how long; that was found and fixed
   separately. This time the variable exists.) */

/* Inter: three weights, and the list is exhaustive — 200 for lead copy, 400
   for everything else, 500 for labels and emphasis. 600 was in here and is no
   longer used anywhere; dropping it stops the browser fetching a face nothing
   renders. Add a weight here only after adding it to the ladder in
   globals.css. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "400", "500"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

/* The display face: titles only, `.display` down to `.heading-md`.

   ONE WEIGHT, AND IT IS NOT A COMPROMISE. Every rung it serves is already
   `font-weight: 400` — `.display`, `.heading-xl`, `.heading-lg`,
   `.heading-md`, plus `.signal-gate-title` and `.ludex-hero-metric`, which
   copy those clamps. Pinning 400 also means the site CANNOT render this face
   bold: "500 is as bold as this site goes" stops being a rule someone has to
   remember and becomes a fact about what is loaded.

   `.heading-sm` (21px) deliberately stays on Inter. Below about 24px a
   display face stops adding character and starts costing legibility, and that
   rung is card titles and list items — interface, not titles. */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
});

/* Both live in lib/site.ts now — the JSON-LD Person node uses the same two
   strings, and two descriptions that disagree is a credibility problem a
   validator will never report. */
const TITLE = SITE_TITLE;
const DESCRIPTION = SITE_DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  /* A template rather than a bare string, so the three case studies stop
     hand-writing the suffix and case study #4 is correct by default. Renders
     byte-identically to what shipped before.

     A route that ever wants NO suffix must use `title: { absolute: "…" }` —
     none do today, and this is the note so the first one that does is not a
     silent double-suffix. */
  title: { default: TITLE, template: "%s — Aditya Harikrishnan" },
  description: DESCRIPTION,
  keywords: [
    "Aditya Harikrishnan",
    "machine learning",
    "recommendation systems",
    "full stack developer",
    "IIIT Pune",
  ],
  authors: [{ name: "Aditya Harikrishnan", url: SITE_URL }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Aditya Harikrishnan",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    /* `images` stated explicitly rather than left to fall back on `og:image`.
       Most scrapers do fall back; not all of them do, and the tag costs a
       line.

       NO `title` or `description` here on purpose. Pinning them meant every
       case study served the site's title as its `twitter:title` — the routes
       do not declare `twitter`, so they inherited these verbatim. Left out,
       Next resolves them from each route's own `title` and `description`. */
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  /* Must track --surface-0. It paints the mobile browser chrome and the
     overscroll gutter, so a stale value shows as a hairline of the old
     palette above and below the page. */
  themeColor: "#1B262C",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
      /* ── THE FIRST PAINT IS THE SITE'S OWN COLOUR ──
         Inline, and it has to be. `colorScheme: "dark"` above tells the
         browser to paint a dark canvas before any stylesheet arrives, and
         Chrome's dark canvas is a flat neutral grey — so on a cold cache the
         entrance opened on several seconds of grey that read as the page
         failing to load rather than as the page arriving. Reported exactly
         that way.

         An external rule cannot fix it, because the gap being covered is the
         one before the external rule exists. An inline style is part of the
         HTML and applies at parse time, so the very first frame is already
         #1B262C and the gate simply resolves out of the right ground.

         THIRD COPY OF THIS HEX, and deliberately so: `--surface-0` in
         globals.css is the source, `themeColor` above mirrors it for the
         mobile browser chrome, and this mirrors it for the pre-stylesheet
         paint. All three exist for the same reason — they are consumed by
         something that cannot read a CSS custom property — and all three must
         move together. */
      style={{ background: "#1B262C" }}
      /* The script below adds `signal-connected` to this element BEFORE React
         hydrates, which is the whole point of it running pre-paint. React then
         compares the class list it rendered on the server against the one in
         the DOM, finds an extra class and reports a hydration mismatch.

         Suppressing it here is the documented answer for exactly this pattern
         and is what every theme-flash script does. It is deliberately narrow:
         it covers attribute differences on this ONE element and nothing else,
         so a genuine mismatch anywhere in the tree is still reported. */
      suppressHydrationWarning
    >
      <head>
        {/* Runs BEFORE first paint, which is the entire point.

            The signal gate ships in the server HTML so a new visitor never
            sees the page flash before it appears. That leaves the opposite
            problem: a returning visitor still inside their clearance would
            see the gate for one frame before React could remove it. This
            decides first and hands CSS a class, so neither group sees a flash
            of the wrong thing.

            IT MUST AGREE WITH components/SignalGate/gate.ts. This is the same
            rule written twice — `"<at>:<ttl>"`, elapsed inside [0, ttl), the
            TTL clamped at 60s — because a pre-paint script cannot import a
            module. The stored format was kept to two integers and a colon
            precisely so this line could stay honest; if it drifts, the gate
            silently stops being hidden and every return visit flashes it.

            Deliberately blocking and tiny. It reads one key and sets one
            class. The try/catch matters because localStorage throws outright
            in some privacy modes, and an exception here would run before
            anything else on the page. Failing open shows the gate, which is
            the harmless direction. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=(localStorage.getItem("signal:cleared")||"").split(":"),t=+p[0],d=Math.min(+p[1],60000),x=Date.now()-t;if(p.length===2&&isFinite(t)&&isFinite(d)&&d>0&&x>=0&&x<d){document.documentElement.classList.add("signal-connected")}}catch(e){}`,
          }}
        />

        {/* ── THE GA OPT-OUT, AND IT IS A SECOND SCRIPT ON PURPOSE ──
            `window['ga-disable-<ID>']` is gtag's own documented opt-out and is
            checked by gtag at every send, so it only has to EXIST before
            gtag.js does. The alternative — read localStorage in an effect,
            then conditionally render <GoogleAnalytics> — costs an extra frame
            for everyone and races the mount.

            SAFER HERE THAN THE SCRIPT ABOVE, which is worth stating: this one
            sets a `window` property rather than a DOM attribute, so unlike
            `signal-connected` it produces no hydration mismatch and leans on
            no `suppressHydrationWarning`.

            NOT MERGED WITH THE SCRIPT ABOVE. That one is documented as
            "deliberately blocking and tiny — it reads one key and sets one
            class", and its whole value is being verifiable by eye against
            gate.ts. Folding an unrelated concern into the one thing on the
            page that has to stay honest is how it stops being honest.

            The key is written out again because a pre-paint script cannot
            import a module. It is kept a bare literal with no internal format,
            precisely so it cannot drift from `OPT_OUT_KEY` in
            lib/analytics.ts — the same discipline, for the same reason, as
            gate.ts and the script above. */}
        {GA_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `try{if(localStorage.getItem("analytics:off")){window[${JSON.stringify("ga-disable-" + GA_ID)}]=true}}catch(e){}`,
            }}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        {/* Who this is and what this site is, for the machines. See
            lib/structuredData.ts on why these are here at all — it is
            retrieval, not rich results. */}
        <JsonLd data={personLd()} />
        <JsonLd data={websiteLd()} />
        <ScrollProvider>
          <RouteScrollReset />
          {/* Sibling of {children}, so it sits OUTSIDE app/template.tsx.
              Inside it, the route-enter opacity tween would fade the cursor
              out on every navigation. Mounting here also means one instance
              for the whole site instead of one per page. */}
          <Cursor />
          {/* Beside <Cursor /> and for the reason stated just above it — one
              instance for the whole site. NOT in app/template.tsx, and that is
              the decisive detail: the template REMOUNTS on every navigation,
              and Vercel's <Analytics> both subscribes to route changes
              internally AND emits a pageview on mount, so every client-side
              navigation would be counted twice. Doubling the accurate baseline
              is exactly what defeats the point of running two tools.

              LiveRings and DeviceTierFlag sit in the template instead, but
              that is not a counter-precedent: LiveRings is there BECAUSE it
              rescans the DOM for each route's media. Nothing here rescans, and
              the delegated listener wants `document`, which a navigation never
              replaces. */}
          <Telemetry />
          {children}
        </ScrollProvider>
      </body>
    </html>
  );
}
