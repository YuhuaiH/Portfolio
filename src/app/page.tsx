import PhotoGrid from "@/components/PhotoGrid";
import { getPhotos } from "@/lib/photos";

export default function Home() {
  const photos = getPhotos();

  return (
    <div className="pb-16">
      {photos.length > 0 ? (
        <PhotoGrid photos={photos} />
      ) : (
        <p className="px-6 text-center text-sm text-muted sm:px-12">
          No photos yet — drop some into <code>public/photos/</code>.
        </p>
      )}
    </div>
  );
}
