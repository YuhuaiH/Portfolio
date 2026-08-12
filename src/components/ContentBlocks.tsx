import Image from "next/image";
import type { ContentBlock } from "@/lib/content";
import { renderInlineText } from "@/lib/content";

// next/image never applies basePath to a hardcoded src when
// images.unoptimized is on (required for static export) — the
// basePath-prefixing logic lives in the default loader, which unoptimized
// mode bypasses entirely. Same fix as SiteHeader.tsx / FilmScene.tsx /
// DigitalCityScene.tsx.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const HEADING_CLASSES: Record<1 | 2 | 3, string> = {
  1: "font-heading text-2xl tracking-wide",
  2: "font-heading text-xl tracking-wide",
  3: "font-heading text-lg tracking-wide",
};

const SPACER_CLASSES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-6",
  md: "h-12",
  lg: "h-20",
};

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading": {
      const level = block.level ?? 1;
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      return <Tag className={HEADING_CLASSES[level]}>{renderInlineText(block.text)}</Tag>;
    }

    case "paragraph":
      return (
        <p className="mt-6 text-sm leading-relaxed text-muted first:mt-0">
          {renderInlineText(block.text)}
        </p>
      );

    case "image":
      return (
        <figure className="mt-6 first:mt-0">
          <div
            className="relative w-full overflow-hidden bg-black"
            style={{ aspectRatio: block.aspectRatio ?? "3 / 2" }}
          >
            <Image
              src={`${BASE_PATH}${block.src}`}
              alt={block.alt}
              fill
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="object-cover"
            />
          </div>
          {block.caption && (
            <figcaption className="mt-2 text-xs tracking-[0.1em] text-muted/70 uppercase">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "gallery": {
      const columns = block.columns ?? 2;
      return (
        <div
          className={`mt-6 grid gap-4 first:mt-0 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          {block.images.map((img) => (
            <figure key={img.src}>
              <div className="relative aspect-square w-full overflow-hidden bg-black">
                <Image
                  src={`${BASE_PATH}${img.src}`}
                  alt={img.alt}
                  fill
                  sizes="(min-width: 1024px) 512px, 100vw"
                  className="object-cover"
                />
              </div>
              {img.caption && (
                <figcaption className="mt-2 text-xs tracking-[0.1em] text-muted/70 uppercase">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      );
    }

    case "spacer":
      return <div className={SPACER_CLASSES[block.size ?? "md"]} />;
  }
}

export default function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </>
  );
}
