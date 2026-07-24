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
        <div key={photo.id} className="mb-8 break-inside-avoid">
          <Image
            src={photo.src}
            alt={photo.name}
            width={photo.width}
            height={photo.height}
            className="w-full h-auto transition-opacity duration-300 hover:opacity-80"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
          <div className="mt-3">
            <h3 className="font-heading text-sm tracking-wide">{photo.name}</h3>
            <p className="text-xs text-muted">{captionSubtitle(photo)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
