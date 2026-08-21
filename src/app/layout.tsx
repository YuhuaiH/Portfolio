import type { Metadata } from "next";
import { Cardo, Cormorant_Garamond } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageTransition from "@/components/PageTransition";
import SceneHeader from "@/components/SceneHeader";
import { FilmFocusProvider } from "@/components/FilmFocusProvider";
import { NavigationPendingProvider } from "@/components/NavigationPendingProvider";
import CollageBackground from "@/components/CollageBackground";
import WoodBackground from "@/components/WoodBackground";
import { getPhotos, getFilmRolls } from "@/lib/photos";
import site from "@/data/site.json";
import { THEME } from "@/lib/theme";
import "./globals.css";

// The site's only color palette lives in src/data/theme.json — this turns
// it into the actual `:root` custom properties every Tailwind color
// utility (bg-background, text-accent-bright, border-accent/30, etc.)
// resolves against, so editing that one file re-themes every page. See
// src/lib/theme.ts for the two spots (WebGL colors, one inline glow) that
// can't just read a CSS var and import theme.json directly instead.
const THEME_STYLE = `:root{--background:${THEME.background};--foreground:${THEME.foreground};--muted:${THEME.muted};--accent:${THEME.accent};--accent-bright:${THEME.accentBright};}`;

// One on/off switch per decorative background layer, in one place, instead
// of commenting an import and its JSX in and out every time one gets
// tried/dropped/brought back — which is what the last several rounds of
// "get rid of X for now" / "bring Y back" actually were. Flip a value here,
// nothing else needs touching.
//
// grain and vignette aren't in this list: they're plain CSS
// (body::before/::after in globals.css), not React-rendered like the
// layers below, so they don't have a prop to gate on the way these do —
// ask if you want those wired into this same system too.
const LAYERS = {
  wood: true, // WoodBackground.tsx — the true backmost layer, static wood grain
  collage: true, // CollageBackground.tsx — the static forest/stream photo
  collageClouds: false, // the three drifting wind*.png clouds inside it
  fog: false,
  lightLeak: false,
  scratches: false, // the diagonal streak texture
};

const cardo = Cardo({
  variable: "--font-cardo",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// style: both — a good chunk of the site's headings render italic (see
// ContentBlocks.tsx, SceneHeader.tsx, PhotoInfoModal.tsx), and next/font
// only bundles the styles it's told to load; without "italic" here those
// classes would fall back to the browser faux-slanting the roman glyphs
// instead of using the typeface's actual italic cut.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: `${site.name} — ${site.role}`,
  description: `${site.role} portfolio of ${site.name}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const photos = getPhotos();
  const filmRolls = getFilmRolls(photos);
  const digitalCount = photos.filter((photo) => photo.type === "digital").length;

  return (
    <html
      lang="en"
      className={`${cardo.variable} ${cormorant.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: THEME_STYLE }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Site-wide vintage texture layers (see globals.css for each) — one
            DOM node per effect rather than cramming more into body's own
            ::before (grain) / ::after (vignette), so each stays independently
            tunable. aria-hidden + pointer-events:none: purely decorative,
            never part of the page's content or interaction. Each one's
            on/off state lives in the LAYERS config above. */}
        {LAYERS.wood && <WoodBackground />}
        {LAYERS.collage && <CollageBackground showClouds={LAYERS.collageClouds} />}
        {LAYERS.fog && <div aria-hidden className="fog" />}
        {LAYERS.lightLeak && <div aria-hidden className="light-leak" />}
        {LAYERS.scratches && <div aria-hidden className="scratches" />}
        {/* Wraps SiteHeader/SceneHeader (the nav triggers) and PageTransition
            (the consumer) together — see NavigationPendingProvider.tsx for
            why a Link's onClick alone isn't enough signal on its own. */}
        <NavigationPendingProvider>
          <SiteHeader />
          <FilmFocusProvider>
            <main className="relative flex-1">
              <SceneHeader filmRolls={filmRolls} digitalCount={digitalCount} />
              <PageTransition>{children}</PageTransition>
            </main>
          </FilmFocusProvider>
        </NavigationPendingProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
