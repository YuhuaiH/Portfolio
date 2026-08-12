import EyeStage from "@/components/EyeStage";
import { renderInlineText } from "@/lib/content";

type Box = { heading: string; text: string };

// One box per corner around the centered eye, in reading order (top-left,
// top-right, bottom-left, bottom-right) — matches the order boxes are
// listed in about.json.
const CORNER_CLASSES = [
  "sm:absolute sm:left-0 sm:top-0 sm:text-left",
  "sm:absolute sm:right-0 sm:top-0 sm:text-right",
  "sm:absolute sm:bottom-0 sm:left-0 sm:text-left",
  "sm:absolute sm:right-0 sm:bottom-0 sm:text-right",
];

function InfoBox({ box, className }: { box: Box; className: string }) {
  return (
    <div
      className={`w-full max-w-[15rem] rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-center backdrop-blur-sm sm:w-56 ${className}`}
    >
      <p className="text-[11px] tracking-[0.15em] text-muted/70 uppercase">
        {renderInlineText(box.heading)}
      </p>
      <p className="mt-1 text-sm text-foreground/90">{renderInlineText(box.text)}</p>
    </div>
  );
}

// The About page's hero: a large 3D eyeball (EyeStage) centered on the
// page, staring at the cursor, with the site owner's info in textboxes
// floating around it. Below sm, there's no room for corners around a
// centered eye, so everything collapses into a single stacked column
// instead — the eye first, then each box in turn.
export default function AboutHero({ boxes }: { boxes: Box[] }) {
  return (
    <div className="relative mx-auto mt-10 flex max-w-sm flex-col items-center gap-6 sm:mt-16 sm:h-[560px] sm:max-w-3xl">
      <div className="h-64 w-64 shrink-0 sm:absolute sm:top-1/2 sm:left-1/2 sm:h-72 sm:w-72 sm:-translate-x-1/2 sm:-translate-y-1/2">
        <EyeStage />
      </div>
      {boxes.map((box, i) => (
        <InfoBox key={box.heading} box={box} className={CORNER_CLASSES[i % CORNER_CLASSES.length]} />
      ))}
    </div>
  );
}
