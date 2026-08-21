"use client";

import { usePersistentAnimationDelay } from "@/lib/usePersistentAnimationDelay";

// A site-wide background layer — a static forest/stream photo with three
// cloud photographs (public/resources/wind*.png) drifting in front of it,
// warped and recolored into the site's own gold/black palette, spread
// across the whole viewport behind every page.
//
// This is genuinely *behind* the page's actual content, not just faded
// enough to not get in the way: unlike grain/vignette/scratches/light-leak
// in globals.css (which are meant to sit on top of everything uniformly,
// simulating a lens/film artifact over the whole photographed image,
// content included), this component is a background scene — content
// should sit in front of it structurally, the same way you'd never expect
// page text to render behind a <body> background-image. Given a negative
// z-index (-z-10) rather than the high positive one the overlay layers
// use, so it paints in the stacking order *below* the page's regular
// (non-positioned) content instead of above it. body has `position:
// relative` (see globals.css), which is what makes it the stacking
// context this negative z-index is evaluated against — without that, a
// negative z-index on a fixed element can end up compared against the
// wrong ancestor entirely.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Two versions of the same warp — a continuously *animated* one (the
// <animate> cycles feTurbulence's own baseFrequency over 40s, so the noise
// pattern, and therefore the warp shape, keeps evolving forever) and a
// static one computed once from a fixed baseFrequency. The animated
// version forces the browser to recompute feTurbulence + feDisplacementMap
// — expensive, non-hardware-accelerated raster work — every single frame,
// for four full-viewport images at once; the static one gets computed once
// and cached as a bitmap the compositor can freely transform for near-
// free. Which images use which is decided per element below via a
// responsive CSS custom property (--collage-distort), not by picking one
// filter for the whole site: desktop gets the richer continuously-morphing
// version since it can afford it, mobile gets the static one — still
// warped, still moving (via .bg-drift / the wind photos' own rotation),
// just without the perpetual recomputation cost.
function CollageDistortFilter() {
  // The <animate> below is SVG SMIL, a completely separate animation
  // mechanism from CSS — fixing .bg-drift's CSS animation-delay (see
  // bgDriftDelay in CollageBackground) does nothing for this one; it has
  // its own independent restart-from-0 on every mount. SMIL's equivalent
  // of a negative animation-delay is a negative `begin` time, so this
  // needs its own persisted offset via the same hook/technique, just
  // applied to a different attribute on a different element.
  const distortBegin = usePersistentAnimationDelay("collage-distort", 40);

  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <filter id="collage-distort-static" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.014 0.021" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="45" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      {/* numOctaves=1, not 2 — each additional octave is another full
          layered noise pass feTurbulence has to compute, every frame this
          filter is live. Halving it (this is the one filter still doing
          continuous per-frame recomputation on desktop) noticeably cuts
          its cost; the noise reads slightly less detailed but the warp
          itself is still fully alive. */}
      <filter id="collage-distort-animated" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="1" seed="7" result="noise">
          <animate
            attributeName="baseFrequency"
            dur="40s"
            values="0.010 0.018;0.017 0.024;0.010 0.018"
            repeatCount="indefinite"
            begin={distortBegin}
          />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="45" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

// Set by every image below via [--collage-distort:...] / sm:[...] classes
// rather than picking a filter id directly in each style={{filter}}, so
// the choice lives in one small reusable class pair instead of every image
// needing its own duplicated responsive filter logic.
const DISTORT_VAR = "[--collage-distort:url(#collage-distort-static)] sm:[--collage-distort:url(#collage-distort-animated)]";
// Always static, on every breakpoint — the second cost cut alongside
// numOctaves above: only 2 of these 4 layers (background.png and wind1,
// below) actually need to be the continuously-recomputed animated filter
// for the whole thing to still read as alive. wind2/wind3 stay static
// everywhere, the same as mobile already got, which roughly halves how
// much of this component's filter work is recurring versus one-time.
const DISTORT_STATIC = "url(#collage-distort-static)";

// Recolors the source cloud photos (blue-white/gray) into the site's warm
// gold, then pushes brightness down hard — this is the "darker, not
// significant" tuning: a much lower brightness than a first pass at this
// (0.4 vs. 0.85) so the shapes read as a dim presence behind the grain
// rather than a lit, recognizable cloud photo.
const COLLAGE_TINT = "grayscale(1) sepia(0.7) saturate(2.4) hue-rotate(-12deg) brightness(0.3) contrast(1.5)";

// A much lighter touch than COLLAGE_TINT above: this photo (a spiral-blur
// forest/stream shot) already has its own dark vignette and warm center
// light baked in, so it doesn't need forcing into the palette the way the
// flat, bright cloud photos did — just dimmed and nudged slightly warm so
// its natural greens don't read as a color the rest of the page never
// uses, while still keeping enough of its own character to read as a
// scene rather than pure abstract texture.
const BACKGROUND_TINT = "saturate(0.65) sepia(0.22) brightness(0.28) contrast(1.08)";

// showClouds: whether the three drifting wind*.png clouds render on top of
// the static backdrop — the backdrop itself always renders whenever this
// component is mounted at all (see LAYERS.collage in layout.tsx for that
// on/off switch); this is the finer-grained one *within* it.
export default function CollageBackground({ showClouds = false }: { showClouds?: boolean }) {
  // "bg-drift" here must match the animation name in globals.css (180s) —
  // it's just a sessionStorage key, not a literal reference to the CSS,
  // but keeping it the same name makes the connection obvious.
  const bgDriftDelay = usePersistentAnimationDelay("bg-drift", 180);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <CollageDistortFilter />
      {/* The backdrop the clouds drift in front of. Gets the same
          responsive warp (DISTORT_VAR) as the clouds below, plus its own
          slow independent rotation (.bg-drift, see globals.css) — much
          slower than the clouds' own warp cycle (180s vs. their 40s) so the
          backdrop reads as quietly alive rather than competing with them
          for attention. Stays first in the stack (painted first = furthest
          back among this component's own children, which — since the whole
          component sits behind the page via -z-10 above — is also furthest
          back overall).
          maskImage: a rotating rectangle needs a *lot* of overscan to keep
          covering an arbitrary-aspect-ratio viewport at every angle — the
          scale that's exactly enough depends on the viewport's own
          proportions (worse on wide/ultrawide screens), so tuning one fixed
          scale value is fragile and was still showing the image's actual
          corner at some angles. Feathering the edges with a radial-gradient
          mask sidesteps the geometry problem rather than solving it more
          precisely: the image fades to transparent well before its real
          boundary could ever be reached, revealing WoodBackground.tsx's
          wood grain underneath — which also happens to be the haze this
          was asked for, not just the boundary fix. */}
      <img
        src={`${BASE_PATH}/resources/background.png`}
        alt=""
        className={`bg-drift absolute inset-0 h-full w-full object-cover opacity-[0.35] ${DISTORT_VAR}`}
        style={{
          filter: `var(--collage-distort) ${BACKGROUND_TINT}`,
          WebkitMaskImage: "radial-gradient(ellipse 62% 62% at 50% 50%, black 45%, transparent 85%)",
          maskImage: "radial-gradient(ellipse 62% 62% at 50% 50%, black 45%, transparent 85%)",
          animationDelay: bgDriftDelay,
        }}
      />
      {showClouds && (
        <>
          {/* Positioned to each own a separate zone of the viewport
              (top-left, top-right, bottom band) rather than all three
              overlapping near the center. Opacity raised alongside the
              background photo above — safe to be more present now that the
              whole layer is structurally behind the page's content. */}
          <img
            src={`${BASE_PATH}/resources/wind1.png`}
            alt=""
            className={`absolute -top-[18%] -left-[20%] w-[58%] max-w-none opacity-[0.18] mix-blend-screen ${DISTORT_VAR}`}
            style={{ filter: `var(--collage-distort) ${COLLAGE_TINT}`, transform: "rotate(-6deg)" }}
          />
          <img
            src={`${BASE_PATH}/resources/wind2.png`}
            alt=""
            className="absolute -top-[8%] -right-[20%] w-[62%] max-w-none opacity-[0.15] mix-blend-screen"
            style={{ filter: `${DISTORT_STATIC} ${COLLAGE_TINT}`, transform: "rotate(5deg)" }}
          />
          {/* wind3.png has an opaque white rectangle artifact in its
              original top-left corner (a leftover from however it was cut
              out) — clip-path crops that off; the other two are clean. */}
          <img
            src={`${BASE_PATH}/resources/wind3.png`}
            alt=""
            className="absolute -bottom-[15%] left-[5%] w-[85%] max-w-none opacity-[0.16] mix-blend-screen"
            style={{
              filter: `${DISTORT_STATIC} ${COLLAGE_TINT}`,
              transform: "rotate(-3deg)",
              clipPath: "inset(22% 0 0 0)",
            }}
          />
          {/* Three more, reusing the same three source photos rather than
              new assets, to fill the zones the first three left empty
              (middle-left, top-center, bottom-right) — six clouds spread
              fairly evenly across the viewport instead of clustered in
              three corners. All static (DISTORT_STATIC), like wind2/wind3
              above: only background.png + the one wind1 instance need to
              stay on the animated filter for the scene to still read as
              alive; every added instance being animated too would undo the
              per-frame cost cut from the last round. */}
          <img
            src={`${BASE_PATH}/resources/wind1.png`}
            alt=""
            className="absolute -right-[15%] -bottom-[20%] w-[55%] max-w-none opacity-[0.15] mix-blend-screen"
            style={{ filter: `${DISTORT_STATIC} ${COLLAGE_TINT}`, transform: "rotate(8deg)" }}
          />
          <img
            src={`${BASE_PATH}/resources/wind2.png`}
            alt=""
            className="absolute top-[32%] left-[8%] w-[42%] max-w-none opacity-[0.13] mix-blend-screen"
            style={{ filter: `${DISTORT_STATIC} ${COLLAGE_TINT}`, transform: "rotate(-4deg)" }}
          />
          <img
            src={`${BASE_PATH}/resources/wind3.png`}
            alt=""
            className="absolute -top-[10%] right-[12%] w-[48%] max-w-none opacity-[0.14] mix-blend-screen"
            style={{
              filter: `${DISTORT_STATIC} ${COLLAGE_TINT}`,
              transform: "rotate(4deg)",
              clipPath: "inset(22% 0 0 0)",
            }}
          />
        </>
      )}
    </div>
  );
}
