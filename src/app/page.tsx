import FilmRollsExplorer from "@/components/FilmRollsExplorer";
import { getPhotos, getFilmRolls } from "@/lib/photos";

export default function Home() {
  const photos = getPhotos();
  const filmRolls = getFilmRolls(photos);

  return (
    <div className="pb-16">
      {filmRolls.length > 0 ? (
        <FilmRollsExplorer filmRolls={filmRolls} />
      ) : (
        // The heading + film/digital switcher are rendered globally (see
        // SceneHeader in layout.tsx), so they're still visible/reachable
        // here even with no rolls to show.
        <p className="px-6 pt-24 text-center text-sm text-muted sm:px-12 sm:pt-28">
          No film rolls yet — drop a folder into <code>public/photos/</code>.
        </p>
      )}
    </div>
  );
}
