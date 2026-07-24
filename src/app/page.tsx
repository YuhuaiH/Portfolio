import PhotoGrid from "@/components/PhotoGrid";
import FilmRollScene from "@/components/FilmRollScene";
import { getPhotos, getFilmRolls } from "@/lib/photos";

export default function Home() {
  const photos = getPhotos();
  const digitalPhotos = photos.filter((photo) => photo.type === "digital");
  const filmRolls = getFilmRolls(photos);

  if (photos.length === 0) {
    return (
      <p className="px-6 pb-16 text-center text-sm text-muted sm:px-12">
        No photos yet — drop some into <code>public/photos/</code>.
      </p>
    );
  }

  return (
    <div className="pb-16">
      {digitalPhotos.length > 0 && (
        <div className="mb-16">
          <PhotoGrid photos={digitalPhotos} />
        </div>
      )}
      {filmRolls.map((roll) => (
        <FilmRollScene key={roll.name} roll={roll} />
      ))}
    </div>
  );
}
