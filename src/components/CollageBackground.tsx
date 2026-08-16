// A site-wide background layer — three cloud photographs
// (public/resources/wind*.png), warped and recolored into the site's own
// gold/black palette, spread across the whole viewport behind every page.
// Kept deliberately dark and low-opacity: this is meant to read as barely-
// there texture behind the grain/vignette/fog, not as a visible collage of
// three photos — see the second EyeHero.tsx attempt this replaced, which
// was too prominent scoped to just the hero.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// A slow, continuously *evolving* warp — not a one-time static
// displacement. The <animate> inside feTurbulence cycles its own
// baseFrequency over 20s, so the noise pattern feeding feDisplacementMap
// keeps drifting and the warp itself keeps changing shape over time. Needs
// to be a real filter primitive graph (can't be a data-URI background
// image the way grain/scratches are), same reasoning as EyeHero.tsx's
// icon-ink filter.
function CollageDistortFilter() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <filter id="collage-distort" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="noise">
          <animate
            attributeName="baseFrequency"
            dur="40s"
            values="0.010 0.018;0.017 0.024;0.010 0.018"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="45" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

// Recolors the source cloud photos (blue-white/gray) into the site's warm
// gold, then pushes brightness down hard — this is the "darker, not
// significant" tuning: a much lower brightness than a first pass at this
// (0.4 vs. 0.85) so the shapes read as a dim presence behind the grain
// rather than a lit, recognizable cloud photo.
const COLLAGE_TINT = "grayscale(1) sepia(0.7) saturate(2.4) hue-rotate(-12deg) brightness(0.3) contrast(1.5)";

export default function CollageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[990] overflow-hidden">
      <CollageDistortFilter />
      {/* Positioned to each own a separate zone of the viewport (top-left,
          top-right, bottom band) rather than all three overlapping near
          the center — the previous positions all landed within roughly
          the same 30–60% x/y band regardless of which corner they were
          anchored from. */}
      <img
        src={`${BASE_PATH}/resources/wind1.png`}
        alt=""
        className="absolute -top-[18%] -left-[20%] w-[58%] max-w-none opacity-[0.09] mix-blend-screen"
        style={{ filter: `url(#collage-distort) ${COLLAGE_TINT}`, transform: "rotate(-6deg)" }}
      />
      <img
        src={`${BASE_PATH}/resources/wind2.png`}
        alt=""
        className="absolute -top-[8%] -right-[20%] w-[62%] max-w-none opacity-[0.07] mix-blend-screen"
        style={{ filter: `url(#collage-distort) ${COLLAGE_TINT}`, transform: "rotate(5deg)" }}
      />
      {/* wind3.png has an opaque white rectangle artifact in its original
          top-left corner (a leftover from however it was cut out) —
          clip-path crops that off; the other two are clean. */}
      <img
        src={`${BASE_PATH}/resources/wind3.png`}
        alt=""
        className="absolute -bottom-[15%] left-[5%] w-[85%] max-w-none opacity-[0.08] mix-blend-screen"
        style={{
          filter: `url(#collage-distort) ${COLLAGE_TINT}`,
          transform: "rotate(-3deg)",
          clipPath: "inset(22% 0 0 0)",
        }}
      />
    </div>
  );
}
