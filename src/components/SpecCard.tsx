import type { ReactNode } from "react";

// The "spec sheet" card language shared by the home page's tickets
// (EyeHero.tsx) and the Projects / Audio / Graphic pages (WorkIndex.tsx,
// WorkDetail.tsx): flat, opaque, muted color blocks with big rounded
// corners and a fine grain, near-black ink, an extra-wide display face
// for titles, and small technical trimmings — index numbers, ruled rows,
// a barcode, a corner arrow — like a piece of industrial labeling.

// One flat stock per destination, so a section reads as "its" color
// everywhere it appears (its ticket, its index cards, its entry pages).
export const TONES = {
  projects: "#e0a15e", // ochre
  photography: "#b5574b", // terracotta
  audio: "#71956b", // sage
  graphic: "#9d9c97", // warm gray
  about: "#d8d1c1", // bone
} as const;

export type ToneKey = keyof typeof TONES;

export const INK = "#141312";

// Which tone a link goes to, by its first path segment ("/projects/x" →
// projects). Anything unknown falls back to bone.
export function toneFor(href: string): string {
  const key = href.split("/")[1] as ToneKey;
  return TONES[key] ?? TONES.about;
}

// A spec-sheet catalogue number for an entry — section code plus its
// position, "PRJ—02" — the label on an entry page's header card.
const CATALOG_CODES: { [key in ToneKey]: string } = {
  projects: "PRJ",
  photography: "PHO",
  audio: "AUD",
  graphic: "GFX",
  about: "ABT",
};

export function catalogNo(section: ToneKey, index: number) {
  return `${CATALOG_CODES[section]}—${pad2(index)}`;
}

// Two-digit index, "01" style.
export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Fine paper-ish grain over the flat color — multiply, so it only ever
// darkens into the stock (the speckle in the reference cards), clipped to
// whatever radius the card itself has.
const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E";

export function Grain() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.22] mix-blend-multiply"
      style={{
        backgroundImage: `url("${GRAIN}")`,
        backgroundSize: "90px 90px",
      }}
    />
  );
}

// Fine horizontal scanlines (see .glitch-scanlines in globals.css) — the
// second half of the cards' texture alongside Grain, like the stock was
// printed off a CRT. Static, so free to draw. Sits under the card's
// content: every content row is position:relative and comes after it.
export function Scanlines() {
  return <span aria-hidden className="glitch-scanlines" />;
}

// A barcode generated from a string — the same text always draws the
// same bars, so each card gets its own stable "serial" rather than one
// clip-art barcode repeated everywhere.
export function Barcode({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  let h = 2166136261;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; x < 92; i++) {
    h ^= value.charCodeAt(i % value.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    const w = 1 + (h % 3);
    if (h & 8) bars.push({ x, w });
    x += w + 1;
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 92 20"
      preserveAspectRatio="none"
      className={className}
    >
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={0}
          width={bar.w}
          height={20}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

// The big chunky ↗ from the reference — a solid shape, not a thin glyph.
export function CornerArrow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className}>
      <path
        d="M5 2h17v17h-5.5V11.4L6.4 21.5 2.5 17.6 12.6 7.5H5Z"
        fill="currentColor"
      />
    </svg>
  );
}

// The three little half-filled discs in the reference's corner — pure
// trim, but it's the kind of detail that makes it read as a spec label.
export function PhaseDots({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex gap-1 ${className}`}>
      <span className="h-3 w-3 rounded-full border border-current" />
      <span className="h-3 w-3 rounded-full border border-current bg-[linear-gradient(90deg,transparent_50%,currentColor_50%)]" />
      <span className="h-3 w-3 rounded-full bg-current" />
    </span>
  );
}

// A label/value line with a hairline rule above it — the boxed table rows
// of the reference ("ROUNDS REMAINING … 571").
export function SpecRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-current/70 py-1.5">
      <span className="shrink-0 text-[10px] font-medium tracking-[0.16em] uppercase opacity-70">
        {label}
      </span>
      <span className="text-right text-xs font-medium">{children}</span>
    </div>
  );
}
