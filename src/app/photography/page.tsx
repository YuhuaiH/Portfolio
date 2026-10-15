import type { Metadata } from "next";
import FilmRollsExplorer from "@/components/FilmRollsExplorer";
import site from "@/data/site.json";
import { getPhotos, getFilmRolls } from "@/lib/photos";

export const metadata: Metadata = {
  title: `Photography — ${site.name}`,
};

export default function PhotographyPage() {
  const photos = getPhotos();
  const filmRolls = getFilmRolls(photos);

  return (
    // pb-8, not pb-16 — combined with the film canvas's own now-shorter
    // height and margin (see FilmRollsExplorer.tsx), this is what actually
    // brings the page's total height down to fit in one viewport like the
    // home page does, instead of needing a scroll to reach the footer.
    <div className="pb-8">
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
