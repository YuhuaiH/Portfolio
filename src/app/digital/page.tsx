import type { Metadata } from "next";
import DigitalCityExplorer from "@/components/DigitalCityExplorer";
import WorkTabs from "@/components/WorkTabs";
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
      <WorkTabs active="digital" />
      {digitalPhotos.length > 0 ? (
        <DigitalCityExplorer photos={digitalPhotos} />
      ) : (
        <p className="px-6 text-center text-sm text-muted sm:px-12">
          No digital photos yet — drop an image + JSON sidecar into{" "}
          <code>public/photos/digital/</code>.
        </p>
      )}
    </div>
  );
}
