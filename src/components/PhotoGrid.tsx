import type { Photo } from "@/data/photos";

export default function PhotoGrid({ photos }: { photos: Photo[] }) {
  return (
    <div className="columns-1 gap-4 px-6 sm:columns-2 sm:px-12 lg:columns-3">
      {photos.map((photo) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photo.id}
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading="lazy"
          className="mb-4 w-full break-inside-avoid rounded-sm object-cover"
        />
      ))}
    </div>
  );
}
