import PhotoGrid from "@/components/PhotoGrid";
import { photos } from "@/data/photos";

export default function Home() {
  return (
    <div className="pb-16">
      <section className="px-6 pb-12 sm:px-12">
        <h1 className="max-w-2xl text-3xl font-light sm:text-4xl">
          Photography by Your Name.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-500">
          A selection of recent work. Replace the placeholder images in{" "}
          <code>src/data/photos.ts</code> with your own.
        </p>
      </section>
      <PhotoGrid photos={photos} />
    </div>
  );
}
