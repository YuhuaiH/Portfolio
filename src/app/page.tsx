import PhotoGrid from "@/components/PhotoGrid";
import { getPhotos } from "@/lib/photos";

export default function Home() {
  const photos = getPhotos();

  return (
    <div className="pb-16">
      <section className="px-6 pb-12 sm:px-12">
        <h1 className="max-w-2xl text-3xl font-light sm:text-4xl">
          Photography by Your Name.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-500">
          A selection of recent work. Add photos in{" "}
          <code>public/photos/</code> — see the README for the metadata
          format.
        </p>
      </section>
      {photos.length > 0 ? (
        <PhotoGrid photos={photos} />
      ) : (
        <p className="px-6 text-sm text-neutral-500 sm:px-12">
          No photos yet — drop some into <code>public/photos/</code>.
        </p>
      )}
    </div>
  );
}
