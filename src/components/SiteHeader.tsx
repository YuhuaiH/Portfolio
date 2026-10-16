"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import site from "@/data/site.json";
import SiteNav from "./SiteNav";
import { useNavigationPending } from "./NavigationPendingProvider";
import { usePresentationMode } from "@/lib/usePresentationMode";

// next/image never applies basePath to a hardcoded src when
// images.unoptimized is on (required for static export), and this URL is
// used as a CSS mask anyway, which nothing would prefix — so prefix it by
// hand, same as FilmScene.tsx.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// logo-mask.svg, not the original logo file: generated from it so the
// letters' dark inner detail survives as a partly-transparent cut (an alpha
// mask ignores color, so the original's two tones would merge into one
// flat gold silhouette).
const LOGO_SRC = `${BASE_PATH}/resources/logo-mask.svg`;

// The logo's letterforms are used purely as a *shape* (a CSS mask), and
// the color comes from this gradient instead of the SVG's own flat fill —
// that's what turns a flat saturated gold into polished metal: a bright
// lip along the top of every stroke, a darker band through the middle
// where the "metal" faces away from the light, and a warm bounce back up
// at the bottom. Same pale, desaturated gold family as the space scene
// (SpaceBackground.tsx) and the eye's haze, so the mark finally belongs
// to the same palette as everything around it.
const GILT = [
  "linear-gradient(180deg,",
  "#fbf1d2 0%,",
  "#e9d4a0 22%,",
  "#c7a462 46%,",
  "#8e6f38 58%,",
  "#c9a868 74%,",
  "#efdcab 100%)",
].join(" ");

const MASK = {
  WebkitMaskImage: `url("${LOGO_SRC}")`,
  WebkitMaskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskImage: `url("${LOGO_SRC}")`,
  maskSize: "contain",
  maskRepeat: "no-repeat",
  maskPosition: "center",
} as const;

// The thin four-point glint from SpaceBackground's sparkles, drawn as an
// SVG so it stays crisp at any size.
function Glint({ className, delay }: { className: string; delay: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`logo-glint pointer-events-none absolute ${className}`}
      style={{ animationDelay: delay }}
    >
      <path
        d="M12 0C12.6 7.6 16.4 11.4 24 12C16.4 12.6 12.6 16.4 12 24C11.4 16.4 7.6 12.6 0 12C7.6 11.4 11.4 7.6 12 0Z"
        fill="#f3e6c4"
      />
    </svg>
  );
}

// Logo hidden while its treatment gets rethought — flip back to true to
// bring the gilt mark (everything below) back. With it off, the header is
// just the nav; on the home page, where SiteNav renders nothing (the
// eye's tickets are the nav there), the header drops out entirely rather
// than leaving an empty padded band above the eye.
const SHOW_LOGO = false;

export default function SiteHeader() {
  const pathname = usePathname();
  const { startNavigating } = useNavigationPending();
  const presentation = usePresentationMode();

  if (presentation) return null;
  if (!SHOW_LOGO && pathname === "/") return null;

  return (
    // page-fade-in: the header only mounts when leaving the home page (it
    // renders nothing on "/"), and it sits outside PageTransition — without
    // its own fade it popped in instantly while the page itself faded.
    <header className="page-fade-in flex flex-col items-center gap-3 px-6 py-5 text-center sm:py-6">
      {SHOW_LOGO && (
        <Link
          href="/"
          aria-label={site.name}
          className="group relative inline-block"
          // pathname !== "/" guard: same reasoning as SiteNav.tsx/
          // SceneHeader.tsx — clicking the logo while already on the home
          // page never fires a pathname change, and would leave `pending`
          // stuck true forever if this fired anyway.
          onClick={pathname !== "/" ? startNavigating : undefined}
        >
          {/* The glow lives on this wrapper, not on the masked span below:
            CSS applies `filter` *before* `mask`, so a drop-shadow on the
            masked element itself would be clipped away by its own mask.
            Up here it traces the finished, masked letterforms. Kept tight
            and faint — light catching a gilded edge, not a neon tube. */}
          <span
            className="block"
            style={{
              filter: [
                "drop-shadow(0 0 6px rgba(239,220,171,0.28))",
                "drop-shadow(0 0 26px rgba(217,192,138,0.14))",
                "drop-shadow(0 2px 3px rgba(0,0,0,0.7))",
              ].join(" "),
            }}
          >
            <span
              aria-hidden
              className="relative block aspect-[14/3] h-20 overflow-hidden sm:h-28"
              style={{ ...MASK, backgroundImage: GILT }}
            >
              {/* A slow band of light that sweeps across the gold on hover —
                clipped to the letters by the same mask as the gilt. */}
              <span
                className="logo-sheen absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(105deg, transparent 35%, rgba(255,248,225,0.75) 50%, transparent 65%)",
                  backgroundSize: "250% 100%",
                }}
              />
            </span>
          </span>
          <Glint
            className="-top-1 right-[3%] h-5 w-5 sm:h-6 sm:w-6"
            delay="0s"
          />
          <Glint
            className="bottom-[8%] left-[1%] h-3 w-3 sm:h-4 sm:w-4"
            delay="-2.4s"
          />
        </Link>
      )}
      <SiteNav />
    </header>
  );
}
