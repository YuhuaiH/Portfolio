import type { Metadata } from "next";
import { Cardo, Cormorant_Garamond } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageTransition from "@/components/PageTransition";
import SceneHeader from "@/components/SceneHeader";
import { FilmFocusProvider } from "@/components/FilmFocusProvider";
import CollageBackground from "@/components/CollageBackground";
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
            never part of the page's content or interaction. */}
        <CollageBackground />
        <div aria-hidden className="fog" />
        <div aria-hidden className="light-leak" />
        <div aria-hidden className="scratches" />
        <SiteHeader />
        <FilmFocusProvider>
          <main className="relative flex-1">
            <SceneHeader filmRolls={filmRolls} digitalCount={digitalCount} />
            <PageTransition>{children}</PageTransition>
          </main>
        </FilmFocusProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
