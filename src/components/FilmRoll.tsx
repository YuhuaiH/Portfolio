import Image from "next/image";
import type { FilmRoll as FilmRollType } from "@/lib/photos";

export default function FilmRoll({ roll }: { roll: FilmRollType }) {
  return (
    <section className="mb-12">
      <div className="mb-3 px-6 sm:px-12">
        <h2 className="font-heading text-lg tracking-wide">{roll.name}</h2>
        <p className="text-xs tracking-[0.15em] text-muted uppercase">
          {roll.photos.length} photo{roll.photos.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="border-y border-dashed border-white/15">
        <div className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 py-4 sm:px-12">
          {roll.photos.map((photo) => (
            <figure key={photo.id} className="flex-none snap-start">
              <Image
                src={photo.src}
                alt={photo.name}
                width={photo.width}
                height={photo.height}
                className="h-64 w-auto sm:h-80"
              />
              <figcaption className="mt-2 text-xs text-muted">{photo.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
