import type { Metadata } from "next";
import DigitalCityExplorer from "@/components/DigitalCityExplorer";
import site from "@/data/site.json";
import { getPhotos } from "@/lib/photos";

export const metadata: Metadata = {
  title: `Digital — ${site.name}`,
};

export default function DigitalPage() {
  const photos = getPhotos();
  const digitalPhotos = photos.filter((photo) => photo.type === "digital");

  return (
    <div className="pb-16">
      {digitalPhotos.length > 0 ? (
        <DigitalCityExplorer photos={digitalPhotos} />
      ) : (
        // The heading + film/digital switcher are rendered globally (see
        // SceneHeader in layout.tsx), so they're still visible/reachable
        // here even with no photos to show.
        <p className="px-6 pt-24 text-center text-sm text-muted sm:px-12 sm:pt-28">
          No digital photos yet — drop an image + JSON sidecar into{" "}
          <code>public/photos/digital/</code>.
        </p>
      )}
    </div>
  );
}
