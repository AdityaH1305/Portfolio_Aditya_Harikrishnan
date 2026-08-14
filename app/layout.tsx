import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ScrollProvider from "@/components/ScrollProvider";
import RouteScrollReset from "@/components/RouteScrollReset";
import Cursor from "@/components/Cursor";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
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
  themeColor: "#0A0908",
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
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Runs BEFORE first paint, which is the entire point.

            The signal gate ships in the server HTML so a new visitor never
            sees the page flash before it appears. That leaves the opposite
            problem: a returning visitor still inside their hour would see the
            gate for one frame before React could remove it. This decides
            first and hands CSS a class, so neither group sees a flash of the
            wrong thing.

            Deliberately blocking and tiny. It reads one key and sets one
            class. The try/catch matters because localStorage throws outright
            in some privacy modes, and an exception here would run before
            anything else on the page. Failing open shows the gate, which is
            the harmless direction. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var v=localStorage.getItem("signal:cleared"),t=Number(v);if(v!==null&&isFinite(t)&&Date.now()-t>=0&&Date.now()-t<3600000){document.documentElement.classList.add("signal-connected")}}catch(e){}`,
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
