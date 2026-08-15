import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ScrollProvider from "@/components/ScrollProvider";
import RouteScrollReset from "@/components/RouteScrollReset";
import Cursor from "@/components/Cursor";

/* Inter, and the weight range matters more than the family here. The design
   sets 18px lead copy at weight 200 and 60px+ headlines at 400 — the same
   weight doing both, with scale carrying the hierarchy instead. Space Grotesk
   could not do that: its lightest cut is 300, and its letterforms assert
   personality at display sizes where this wants a neutral surface. */
/* Three weights, and the list is exhaustive: 200 for lead copy, 400 for
   everything else, 500 for labels and emphasis. 600 was in here and is no
   longer used anywhere — it was a fourth weight that only appeared through
   scattered `font-semibold` utilities, and dropping it stops the browser
   fetching a face nothing renders. Add a weight here only after adding it to
   the ladder in globals.css. */
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

const SITE_URL = "https://adityaharikrishnan.vercel.app";
const TITLE = "Aditya Harikrishnan — ML Systems & Full-Stack Engineering";
const DESCRIPTION =
  "CS undergrad at IIIT Pune building recommendation systems, data platforms, and applied AI. Ludex: a hybrid recommender with +27% Precision@20 over baseline.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
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
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
      </head>
      <body className="min-h-full flex flex-col">
        <ScrollProvider>
          <RouteScrollReset />
          {/* Sibling of {children}, so it sits OUTSIDE app/template.tsx.
              Inside it, the route-enter opacity tween would fade the cursor
              out on every navigation. Mounting here also means one instance
              for the whole site instead of one per page. */}
          <Cursor />
          {children}
        </ScrollProvider>
      </body>
    </html>
  );
}
