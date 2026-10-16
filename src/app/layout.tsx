import type { Metadata, Viewport } from "next";
import { Cardo, Cormorant_Garamond, Space_Grotesk, Unbounded } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageTransition from "@/components/PageTransition";
import SceneHeader from "@/components/SceneHeader";
import PresentationMain from "@/components/PresentationMain";
import { FilmFocusProvider } from "@/components/FilmFocusProvider";
import { NavigationPendingProvider } from "@/components/NavigationPendingProvider";
import SpaceBackground from "@/components/SpaceBackground";
import { getPhotos, getFilmRolls } from "@/lib/photos";
import site from "@/data/site.json";
import { THEME, hexToRgbTriplet } from "@/lib/theme";
import "./globals.css";

// The site's only color palette lives in src/data/theme.json — this turns
// it into the actual `:root` custom properties every Tailwind color
// utility (bg-background, text-accent-bright, border-accent/30, etc.)
// resolves against, so editing that one file re-themes every page. See
// src/lib/theme.ts for the two spots (WebGL colors, one inline glow) that
// can't just read a CSS var and import theme.json directly instead.
// --accent-bright-rgb is the same accent as a bare "r, g, b" triplet, for
// the handful of glows/shadows that need it at a custom alpha in plain CSS
// or a Tailwind arbitrary value: rgba(var(--accent-bright-rgb), 0.4).
const THEME_STYLE = `:root{--background:${THEME.background};--foreground:${THEME.foreground};--muted:${THEME.muted};--accent:${THEME.accent};--accent-bright:${THEME.accentBright};--accent-bright-rgb:${hexToRgbTriplet(THEME.accentBright)};}`;

// The site-wide background. The old vintage layers (wood, collage photo,
// fog, light leak, scratches, film grain, vignette) were retired and their
// code removed — see git history if one is ever wanted back. Set false to
// fall back to the theme's flat --background color.
const LAYERS = {
  space: true, // SpaceBackground.tsx — the 3D asteroid canyon / gold dust scene
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

// The spec-card UI (SpecCard.tsx — home tickets, Projects/Audio/Graphic
// cards): Unbounded is the heavy, extra-wide display face for card titles;
// Space Grotesk the small technical labels, rows and numbers.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// What a shared link shows (Discord, iMessage, Slack, X…): the Open Graph
// and Twitter-card tags below, plus the preview image generated at build
// time by src/app/og.png/route.tsx. metadataBase is the deploy origin, so
// the image path (which carries the /Portfolio basePath itself) resolves
// to the absolute URL link-preview crawlers require. Every page inherits
// these; pages only override their own <title>.
const TITLE = `${site.fullName} — ${site.role}`;
const OG_IMAGE = {
  url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/og.png`,
  width: 1200,
  height: 630,
  alt: TITLE,
};

export const metadata: Metadata = {
  metadataBase: new URL(new URL(site.url).origin),
  // The eyeball favicon, rendered from the 3D eye's own textures (sclera
  // veins pushed bloodier). Plain files in public/ with the basePath spelled
  // out — like OG_IMAGE — rather than app/icon.png, so the links can't lose
  // the /Portfolio prefix under static export.
  icons: {
    icon: [
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/favicon.ico`, sizes: "16x16 32x32 48x48" },
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.png`, type: "image/png", sizes: "192x192" },
    ],
    apple: { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/apple-icon.png`, sizes: "180x180" },
  },
  title: TITLE,
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.fullName,
    title: TITLE,
    description: site.description,
    url: site.url,
    locale: "en_US",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: site.description,
    images: [OG_IMAGE],
  },
};

// The accent stripe down the side of a Discord embed (and the browser UI
// tint on mobile) — the same pale gold as the space scene and the eye.
export const viewport: Viewport = {
  themeColor: "#d9c08a",
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
      className={[
        cardo.variable,
        cormorant.variable,
        unbounded.variable,
        spaceGrotesk.variable,
        "h-full antialiased",
        LAYERS.space ? "space-bg" : "",
      ].join(" ")}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: THEME_STYLE }} />
      </head>
      <body className="min-h-full flex flex-col">
        {LAYERS.space && <SpaceBackground />}
        {/* Wraps SiteHeader/SceneHeader (the nav triggers) and PageTransition
            (the consumer) together — see NavigationPendingProvider.tsx for
            why a Link's onClick alone isn't enough signal on its own. */}
        <NavigationPendingProvider>
          <SiteHeader />
          <FilmFocusProvider>
            <PresentationMain>
              <SceneHeader filmRolls={filmRolls} digitalCount={digitalCount} />
              <PageTransition>{children}</PageTransition>
            </PresentationMain>
          </FilmFocusProvider>
        </NavigationPendingProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
