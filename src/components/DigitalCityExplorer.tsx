"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Photo } from "@/lib/photos";
import PhotoInfoModal from "./PhotoInfoModal";

const DigitalCityScene = dynamic(() => import("./DigitalCityScene"), {
  ssr: false,
  loading: () => <div className="h-[560px] w-full animate-pulse bg-white/5 sm:h-[640px]" />,
});

export default function DigitalCityExplorer({ photos }: { photos: Photo[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  return (
    <section className="mb-16">
      <div className="mb-2 px-6 text-center sm:px-12">
        <h2 className="font-heading text-lg tracking-wide">Digital</h2>
        <p className="text-xs tracking-[0.15em] text-muted uppercase">
          {photos.length} photo{photos.length === 1 ? "" : "s"} · click a billboard for details
        </p>
      </div>
      <div className="h-[560px] w-full bg-black sm:h-[640px]">
        <DigitalCityScene photos={photos} onSelect={setSelectedPhoto} />
      </div>
      {selectedPhoto && (
        <PhotoInfoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </section>
  );
}
