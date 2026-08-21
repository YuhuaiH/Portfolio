"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import site from "@/data/site.json";
import SiteNav from "./SiteNav";
import { THEME, hexToRgba } from "@/lib/theme";
import { useNavigationPending } from "./NavigationPendingProvider";

// next/image never applies basePath to a hardcoded src when
// images.unoptimized is on (required for static export) — the
// basePath-prefixing logic lives in the default loader, which
// unoptimized mode bypasses entirely. Same fix as FilmScene.tsx /
// DigitalCityScene.tsx.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const LOGO_SRC = `${BASE_PATH}/resources/logo%20Yuhuai.svg`;

// A grayscale-noise tile like the page-wide grain in globals.css, but with
// an added contrast boost (the feComponentTransfer below): raw turbulence
// output clusters tightly around mid-gray, which read as barely-there haze
// once multiplied over the logo's thin letterform strokes. Stretching the
// contrast (linear, slope 3 / intercept -1) pushes it toward actual black/
// white blotches, so the grain reads as grain instead of a faint blur.
const GRAIN_TILE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch' result='t'/%3E%3CfeColorMatrix in='t' type='saturate' values='0' result='g'/%3E%3CfeComponentTransfer in='g'%3E%3CfeFuncR type='linear' slope='3' intercept='-1'/%3E%3CfeFuncG type='linear' slope='3' intercept='-1'/%3E%3CfeFuncB type='linear' slope='3' intercept='-1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export default function SiteHeader() {
  const pathname = usePathname();
  const { startNavigating } = useNavigationPending();

  return (
    <header className="flex flex-col items-center gap-3 px-6 py-5 text-center sm:py-6">
      {/* The glow's `filter` lives on the Image itself now, not this
          wrapper — a `filter` on an ancestor creates a new stacking
          context, and mix-blend-mode can only blend an element against
          content painted behind it *within that same context*. With the
          filter up here, the Image was the first thing painted inside that
          new context, so its exclusion blend had nothing behind it to
          blend with — set correctly but functionally inert. Putting the
          filter on the Image instead leaves this Link unfiltered, so the
          Image blends against the actual page background behind it. The
          one cost: the glow's silhouette is now traced from the Image
          alone rather than image+grain-span together, but the grain is
          mask-clipped to that exact same logo shape, so the visible
          difference is negligible. */}
      <Link
        href="/"
        className="relative inline-block"
        // pathname !== "/" guard: same reasoning as SiteNav.tsx/
        // SceneHeader.tsx — clicking the logo while already on the home
        // page never fires a pathname change, and would leave `pending`
        // stuck true forever if this fired anyway.
        onClick={pathname !== "/" ? startNavigating : undefined}
      >
        <Image
          src={LOGO_SRC}
          alt={site.name}
          width={1400}
          height={300}
          priority
          className="mix-blend-exclusion h-20 w-auto sm:h-28"
          style={{
            filter: [
              `drop-shadow(0 0 22px ${hexToRgba(THEME.accentBright, 0.65)})`,
              `drop-shadow(0 0 48px ${hexToRgba(THEME.accentBright, 0.35)})`,
              "drop-shadow(0 3px 4px rgba(0,0,0,0.6))",
            ].join(" "),
          }}
        />
        {/* Grain masked to the logo's own silhouette (via the same SVG as
            its alpha/luminance mask) rather than a plain rectangle overlay
            — so the speckle sits on the letterforms themselves, like worn
            ink on a vintage print, instead of floating as a hazy box
            around them. mix-blend-mode: multiply lets the noise's dark
            flecks eat into the red fill while the lighter flecks leave it
            untouched, rather than flattening the whole mark to gray. The
            background-position animation (see .logo-grain in globals.css)
            flickers that speckle across the letters instead of leaving it
            static, so it actually reads as grain rather than a fixed
            texture easy to mistake for a rendering artifact. */}
        <span
          aria-hidden
          className="logo-grain pointer-events-none absolute inset-0 mix-blend-multiply opacity-85"
          style={{
            backgroundImage: `url("${GRAIN_TILE}")`,
            backgroundSize: "55px 55px",
            WebkitMaskImage: `url("${LOGO_SRC}")`,
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: `url("${LOGO_SRC}")`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            animation: "logo-grain-shift 0.7s steps(5) infinite",
          }}
        />
      </Link>
      <SiteNav />
    </header>
  );
}
