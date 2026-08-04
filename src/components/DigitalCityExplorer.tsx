"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Photo } from "@/lib/photos";
import PhotoInfoModal from "./PhotoInfoModal";

const DigitalCityScene = dynamic(() => import("./DigitalCityScene"), {
  ssr: false,
  loading: () => <div className="mt-6 h-[560px] w-full animate-pulse bg-white/5 sm:mt-8 sm:h-[680px]" />,
});

export default function DigitalCityExplorer({ photos }: { photos: Photo[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  return (
    <section className="mb-16">
      {/* The heading + film/digital switcher live in SceneHeader (rendered
          once in layout.tsx) rather than here. */}
      <div className="mt-6 h-[560px] w-full bg-black sm:mt-8 sm:h-[680px]">
        <DigitalCityScene photos={photos} onSelect={setSelectedPhoto} />
      </div>
      {selectedPhoto && (
        <PhotoInfoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </section>
  );
}
