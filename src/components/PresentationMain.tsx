"use client";

import { usePresentationMode } from "@/lib/usePresentationMode";

// Every page's content sits vertically centered in the space between the
// header and footer — flex + justify-center on a main that flex-1 stretches
// to fill the viewport. A page taller than the viewport is unaffected: main
// just grows to fit it and scrolls as normal.
//
// Presentation mode (?present=1) hides the header/nav/footer chrome for
// recording; there the centered child also gets an extra top margin,
// since a dead-centered block in an otherwise empty frame reads as
// slightly high to the eye.
export default function PresentationMain({ children }: { children: React.ReactNode }) {
  const presentation = usePresentationMode();

  return (
    <main className="relative flex flex-1 flex-col justify-center">
      <div className={presentation ? "mt-[6vh]" : ""}>{children}</div>
    </main>
  );
}
