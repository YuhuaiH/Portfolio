"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { renderInlineText } from "@/lib/content";

// next/image never applies basePath to a hardcoded src when
// images.unoptimized is on (required for static export) — same fix as
// SiteHeader.tsx / FilmScene.tsx.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Four roles at the four corners around the portrait — the same "centered
// focal point with labels around it" shape as the home page's eye hero, in
// this page's own plain-text treatment.
const ROLES = ["Artist", "Musician", "Designer", "Developer"] as const;
const ROLE_POSITION_CLASSES = [
  "sm:absolute sm:left-0 sm:top-0",
  "sm:absolute sm:right-0 sm:top-0",
  "sm:absolute sm:bottom-0 sm:left-0",
  "sm:absolute sm:right-0 sm:bottom-0",
] as const;
// Where each label drifts in from: its own corner.
const ROLE_DIRS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

const GREETING = "Good morning, and in case I don't see ya, good afternoon, good evening, and good night!";
// Repeated twice with a bullet between so the loop reads as continuous
// text rather than one lap of words followed by a long empty gap.
const ORBIT_TEXT = `${GREETING}   •   ${GREETING}   •   `;

// The greeting circling the portrait — a "circle" in SVG path syntax is two
// semicircle arcs back to the start. Radius 150 fits the doubled greeting
// in one lap without overlapping at the seam.
function OrbitText() {
  return (
    <svg
      viewBox="0 0 340 340"
      aria-hidden
      className="animate-orbit-spin pointer-events-none absolute inset-0 h-full w-full"
      style={{ transformOrigin: "50% 50%" }}
    >
      <defs>
        <path id="orbit-path" d="M170,170 m-150,0 a150,150 0 1,1 300,0 a150,150 0 1,1 -300,0" />
      </defs>
      <text className="fill-accent-bright/70 text-[10px] tracking-[0.1em]">
        <textPath href="#orbit-path" xlinkHref="#orbit-path" startOffset="0%">
          {ORBIT_TEXT}
        </textPath>
      </text>
    </svg>
  );
}

// The portrait and its light, in three clean layers:
//   - an even, soft glow around the photo — a smooth radial falloff that
//     starts at the photo's edge, breathing gently (opacity only);
//   - the photo, its edge feathered into the dark;
//   - a thin rim of light on that edge, brightest on one side and fading
//     around the circle, slowly travelling round — light catching a rim.
function Portrait({ entered }: { entered: boolean }) {
  return (
    <div className="absolute top-1/2 left-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2">
      <div
        aria-hidden
        className="halo-breathe pointer-events-none absolute -inset-[30%] rounded-full"
        style={{
          // The photo's edge sits at 62.5% of this box's radius.
          background:
            "radial-gradient(circle closest-side, transparent 60%, rgba(var(--accent-bright-rgb),0.15) 63%, rgba(var(--accent-bright-rgb),0.06) 76%, transparent 100%)",
        }}
      />
      <div
        className="animate-photo-spin absolute inset-0 rounded-full"
        style={{
          transformOrigin: "50% 50%",
          WebkitMaskImage: "radial-gradient(circle closest-side, #000 90%, transparent 100%)",
          maskImage: "radial-gradient(circle closest-side, #000 90%, transparent 100%)",
        }}
      >
        <Image
          src={`${BASE_PATH}/about/profile.jpg`}
          alt="Portrait of Yuhuai Huang"
          fill
          sizes="(min-width: 640px) 248px, 180px"
          // The source's raw pixels are landscape (a portrait shot without
          // EXIF orientation applied) — rotated upright here.
          className="-rotate-90 object-cover"
        />
      </div>
      <div
        aria-hidden
        className={`animate-orbit-spin pointer-events-none absolute inset-0 rounded-full blur-[0.6px] transition-opacity delay-300 duration-[1600ms] ease-out ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "conic-gradient(from 220deg, rgba(var(--accent-bright-rgb),0.85), rgba(var(--accent-bright-rgb),0.18) 22%, rgba(var(--accent-bright-rgb),0.04) 50%, rgba(var(--accent-bright-rgb),0.18) 78%, rgba(var(--accent-bright-rgb),0.85))",
          WebkitMaskImage:
            "radial-gradient(circle closest-side, transparent calc(100% - 2.5px), #000 calc(100% - 1.5px), #000 100%, transparent 100%)",
          maskImage:
            "radial-gradient(circle closest-side, transparent calc(100% - 2.5px), #000 calc(100% - 1.5px), #000 100%, transparent 100%)",
        }}
      />
    </div>
  );
}

// One step of the entrance sequence: fades in from `from` (a translate and
// a little blur) after `delay` ms. Plain CSS transitions keyed off a single
// `entered` flip, so the whole sequence is choreographed by delays alone.
function Reveal({
  entered,
  delay,
  from,
  className = "",
  children,
}: {
  entered: boolean;
  delay: number;
  from: string;
  className?: string;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    opacity: entered ? 1 : 0,
    translate: entered ? "0 0" : from,
    filter: entered ? "blur(0)" : "blur(6px)",
    transitionDelay: `${delay}ms`,
  };
  return (
    <div
      className={`transition-[opacity,translate,filter] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

// The About page: the portrait centered, the four roles at its corners, and
// the introduction below split to keep the same symmetry — the name
// centered, then two mirrored halves either side of a thin center line
// (who and where on the left, set flush to the line; what on the right),
// then the contact line, centered. On phones everything stacks.
//
// It plays in once, as a sequence: the portrait fades up, the roles drift
// in from their corners, the name rises, the center line draws itself, the
// two halves slide outward from it, and the contact line settles last.
export default function AboutHero({
  title,
  left,
  right,
  contact,
}: {
  title: string;
  left: string;
  right: string;
  contact: string;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // Double rAF: without it the first paint can land on the same frame as
    // the state flip, so there's no pre-entrance state to transition from.
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
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-12">
      {/* Phones: the portrait, then the four roles as a 2×2 grid under it —
          the same arrangement as the desktop corners, just compacted (they
          used to stack into one long column of four lines). From sm up the
          roles sit at the real corners around the portrait. */}
      <div className="relative mx-auto grid max-w-xs grid-cols-2 justify-items-center gap-x-6 gap-y-1 sm:block sm:h-[480px] sm:max-w-3xl">
        <div
          className={`relative col-span-2 mb-4 h-72 w-72 shrink-0 transition-[opacity,scale] sm:mb-0 duration-1000 ease-out sm:absolute sm:top-1/2 sm:left-1/2 sm:h-[25rem] sm:w-[25rem] sm:-translate-x-1/2 sm:-translate-y-1/2 ${
            entered ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          <OrbitText />
          <Portrait entered={entered} />
        </div>
        {ROLES.map((role, i) => (
          <div
            key={role}
            className={`text-center transition-[opacity,translate] duration-700 ease-out sm:w-auto ${ROLE_POSITION_CLASSES[i]}`}
            style={{
              opacity: entered ? 1 : 0,
              translate: entered ? "0 0" : `${ROLE_DIRS[i][0] * 18}px ${ROLE_DIRS[i][1] * 18}px`,
              transitionDelay: `${300 + i * 110}ms`,
            }}
          >
            <span className="font-heading text-lg text-foreground italic sm:text-2xl">{role}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center sm:mt-12">
        <Reveal entered={entered} delay={900} from="0 12px">
          <h1 className="mx-auto max-w-3xl font-heading text-3xl tracking-wide text-balance text-foreground italic sm:text-4xl">
            {renderInlineText(title)}
          </h1>
        </Reveal>

        <div className="relative mt-8 grid gap-6 sm:mt-10 sm:grid-cols-2 sm:gap-0">
          {/* The center line, drawing itself outward from its middle. */}
          <div
            aria-hidden
            className={`absolute top-0 bottom-0 left-1/2 hidden w-px origin-center -translate-x-1/2 bg-accent-bright/45 transition-[scale] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:block ${
              entered ? "scale-y-100" : "scale-y-0"
            }`}
            style={{ transitionDelay: "1150ms" }}
          />
          {/* The two halves slide *outward* from the center line. */}
          <Reveal entered={entered} delay={1350} from="20px 0" className="sm:pr-10 sm:text-right">
            <p className="text-base leading-relaxed text-foreground/85 sm:text-lg">{renderInlineText(left)}</p>
          </Reveal>
          <Reveal entered={entered} delay={1500} from="-20px 0" className="sm:pl-10 sm:text-left">
            <p className="text-base leading-relaxed text-foreground/85 sm:text-lg [&_a]:underline [&_a]:decoration-accent-bright/50 [&_a]:underline-offset-4 hover:[&_a]:text-accent-bright">
              {renderInlineText(right)}
            </p>
          </Reveal>
        </div>

        <Reveal entered={entered} delay={1900} from="0 10px" className="mt-10">
          <p className="text-xs tracking-[0.14em] text-foreground/80 uppercase sm:text-sm [&_a]:underline [&_a]:decoration-accent-bright/50 [&_a]:underline-offset-4 hover:[&_a]:text-accent-bright">
            {renderInlineText(contact)}
          </p>
        </Reveal>
      </div>
    </div>
  );
}
