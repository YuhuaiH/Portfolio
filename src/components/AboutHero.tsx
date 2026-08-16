"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// next/image never applies basePath to a hardcoded src when
// images.unoptimized is on (required for static export) — same fix as
// SiteHeader.tsx / FilmScene.tsx / DigitalCityScene.tsx.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Four roles at the four corners, matching the home page's eye hero in
// spirit (a centered focal point with labels floating around it) but with
// its own simpler treatment — plain text, no ticket/perforation motif —
// so About doesn't read as a re-skinned copy of the home page.
const ROLES = ["Artist", "Musician", "Designer", "Developer"] as const;
const ROLE_POSITION_CLASSES = [
  "sm:absolute sm:left-0 sm:top-0",
  "sm:absolute sm:right-0 sm:top-0",
  "sm:absolute sm:bottom-0 sm:left-0",
  "sm:absolute sm:right-0 sm:bottom-0",
] as const;
// Slide-in direction per corner, matching its position — purely cosmetic
// (unlike EyeHero's CORNER_DIRS, nothing here reacts to it), just where
// each label drifts in from on mount.
const ROLE_DIRS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

const GREETING = "Good morning, and in case I don't see ya, good afternoon, good evening, and good night!";
// Repeated twice with a bullet between so the loop reads as continuous
// text rather than one lap of words followed by a long empty gap around
// the rest of the circle — a single pass is shorter than the path's own
// circumference at any reasonable font size.
const ORBIT_TEXT = `${GREETING}   •   ${GREETING}   •   `;

// The circular path text rides along — a "circle" in SVG path syntax is
// two semicircle arcs back to the start, not a single primitive. Radius
// (135) is sized to sit just outside the photo's own edge (see the
// h-[62%] circle below) within a 320×320 viewBox, leaving enough margin
// past the path itself for the text's ascenders/descenders not to clip
// against the SVG's own edge.
function OrbitText() {
  return (
    <svg
      viewBox="0 0 320 320"
      aria-hidden
      className="animate-orbit-spin pointer-events-none absolute inset-0 h-full w-full"
      style={{ transformOrigin: "50% 50%" }}
    >
      <defs>
        <path id="orbit-path" d="M160,160 m-135,0 a135,135 0 1,1 270,0 a135,135 0 1,1 -270,0" />
      </defs>
      <text className="fill-accent-bright/75 text-[10px] tracking-[0.1em]">
        <textPath href="#orbit-path" xlinkHref="#orbit-path" startOffset="0%">
          {ORBIT_TEXT}
        </textPath>
      </text>
    </svg>
  );
}

// The About page's own hero: a round portrait centered in a ring of
// looping greeting text, with the four roles floating at the corners
// around it — the same "centered focal point + corner labels" shape as
// the home page's eye hero, translated into this page's own visual
// language rather than reusing EyeHero's ticket-card components directly.
export default function AboutHero() {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // Double rAF, same reasoning as EyeHero's entrance: without it the
    // first paint can land on the same frame as the state flip, so the
    // browser never sees the pre-entrance state to transition away from.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  return (
    <div className="relative mx-auto mt-6 flex max-w-sm flex-col items-center gap-6 sm:mt-8 sm:h-[420px] sm:max-w-3xl">
      <div
        className={`relative h-72 w-72 shrink-0 transition-opacity duration-700 ease-out sm:absolute sm:top-1/2 sm:left-1/2 sm:h-80 sm:w-80 sm:-translate-x-1/2 sm:-translate-y-1/2 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Same warm-halo recipe as the eye's own glow on the home page —
            a visual rhyme between the two hero photos rather than an
            identical component. */}
        <div
          aria-hidden
          className="animate-eye-glow pointer-events-none absolute -inset-8 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(219,168,63,0.3) 0%, rgba(219,168,63,0) 70%)",
          }}
        />
        <OrbitText />
        <div className="absolute top-1/2 left-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-4 border-accent-bright/40 shadow-[0_0_40px_-10px_rgba(219,168,63,0.5)]">
          <Image
            src={`${BASE_PATH}/about/profile.jpg`}
            alt="Portrait"
            fill
            sizes="(min-width: 640px) 320px, 288px"
            className="object-cover"
          />
        </div>
      </div>
      {ROLES.map((role, i) => (
        <div
          key={role}
          className={`w-full text-center transition-all duration-500 ease-out sm:w-auto ${ROLE_POSITION_CLASSES[i]}`}
          style={{
            opacity: entered ? 1 : 0,
            transform: entered
              ? "translate(0, 0)"
              : `translate(${ROLE_DIRS[i][0] * 18}px, ${ROLE_DIRS[i][1] * 18}px)`,
            transitionDelay: `${220 + i * 110}ms`,
          }}
        >
          <span className="font-heading text-xl text-foreground italic sm:text-2xl">{role}</span>
        </div>
      ))}
    </div>
  );
}
