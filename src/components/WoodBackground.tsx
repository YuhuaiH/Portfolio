// The true backmost layer on the page — a plain, static wood-grain photo
// with no animation and no distortion filter (unlike CollageBackground.tsx,
// which warps/animates its images), just a color-matching tint. -z-20, one
// step further back than CollageBackground's -z-10, so it sits behind even
// that forest/cloud scene: wood grain as the literal foundation the whole
// page's imagery floats in front of, everything else (the collage, the
// page's real content, the grain/vignette/etc. overlays) layers on top of
// it in the usual order.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// The source photo is already warm brown/tan — the same hue family as the
// site's gold accent — so this only needs dimming and a touch of extra
// contrast to keep the grain reading once darkened, not the hue-shifting
// COLLAGE_TINT/BACKGROUND_TINT do in CollageBackground.tsx for their
// cooler-toned sources. brightness dropped further (0.28 → 0.16) plus an
// opacity cut on top of that — it was reading as a clearly wood-grained
// backdrop rather than a faint foundation texture; this should recede
// enough that it's felt more than seen.
const WOOD_TINT = "saturate(0.85) brightness(0.2) contrast(1.15)";

export default function WoodBackground() {
  return (
    <img
      aria-hidden
      src={`${BASE_PATH}/resources/wood.jpg`}
      alt=""
      className="pointer-events-none fixed inset-0 -z-20 h-full w-full object-cover opacity-[0.6]"
      style={{ filter: WOOD_TINT }}
    />
  );
}
