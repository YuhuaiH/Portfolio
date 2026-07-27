import FilmRollsExplorer from "@/components/FilmRollsExplorer";
import WorkTabs from "@/components/WorkTabs";
import { getPhotos, getFilmRolls } from "@/lib/photos";

export default function Home() {
  const photos = getPhotos();
  const filmRolls = getFilmRolls(photos);

  return (
    <div className="pb-16">
      <WorkTabs active="film" />
      {filmRolls.length > 0 ? (
        <FilmRollsExplorer filmRolls={filmRolls} />
      ) : (
        <p className="px-6 text-center text-sm text-muted sm:px-12">
          No film rolls yet — drop a folder into <code>public/photos/</code>.
        </p>
      )}
    </div>
  );
}
