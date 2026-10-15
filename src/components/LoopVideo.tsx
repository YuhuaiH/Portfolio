"use client";

import { useEffect, useRef } from "react";

// A short silent clip that loops like a GIF — but only while it's actually
// on screen. A project page can carry a dozen of these (The Tale of Oath's
// spell reel); letting every one decode and play at once, scrolled into
// view or not, is exactly the kind of always-on background cost the rest
// of the site has been cutting. preload="none" + an IntersectionObserver:
// nothing downloads until a clip is near the viewport, and it pauses again
// once it scrolls away.
export default function LoopVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: "200px" }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return <video ref={ref} src={src} muted loop playsInline preload="none" className={className} />;
}
