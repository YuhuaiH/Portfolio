import Image from "next/image";
import type { Photo } from "@/lib/photos";

function captionSubtitle(photo: Photo) {
  const date = new Date(photo.time).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
  return photo.type === "film" ? `${date} · ${photo.filmRoll}` : `${date} · Digital`;
}

export default function PhotoGrid({ photos }: { photos: Photo[] }) {
  return (
    <div className="columns-1 gap-4 px-6 sm:columns-2 sm:px-12 lg:columns-3">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative mb-4 break-inside-avoid overflow-hidden rounded-sm"
        >
          <Image
            src={photo.src}
            alt={photo.name}
            width={photo.width}
            height={photo.height}
            className="w-full h-auto"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent p-3 text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <p className="text-sm">{photo.name}</p>
            <p className="text-xs text-white/70">{captionSubtitle(photo)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
