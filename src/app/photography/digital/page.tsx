import type { Metadata } from "next";
import PhotoCompilation from "@/components/PhotoCompilation";
import site from "@/data/site.json";
import { getPhotos } from "@/lib/photos";

export const metadata: Metadata = {
  title: `Digital — ${site.name}`,
};

// Every digital photo as one compilation — justified rows, shuffled by
// default or in name order; click any photo for a full-screen viewer (see
// PhotoCompilation.tsx).
// Folder and sidecar format: README → "Adding photos".
export default function DigitalPage() {
  const photos = getPhotos()
    .filter((photo) => photo.type === "digital")
    // Name order — natural, so numbers compare as numbers (DSC_0213 before
    // DSC_1019, "2" before "10"). This is the "In order" mode; the default
    // shuffled mode reorders it in the browser.
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true, sensitivity: "base" }))
    .map(({ id, gridSrc, previewSrc, width, height, name, time }) => ({
      id,
      gridSrc,
      previewSrc,
      width,
      height,
      name,
      time,
    }));

  return (
    // Top padding clears the Film/Digital header floating over the page
    // (SceneHeader, absolutely positioned) — it's taller on phones, where
    // its line of text wraps, so the shuffle toggle used to slide under it.
    <section className="mx-auto w-full max-w-6xl px-4 pt-40 pb-12 sm:px-8 sm:pt-36">
      <PhotoCompilation photos={photos} />
    </section>
  );
}
