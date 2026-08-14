import Image from "next/image";
import Link from "next/link";
import site from "@/data/site.json";
import SiteNav from "./SiteNav";

// next/image never applies basePath to a hardcoded src when
// images.unoptimized is on (required for static export) — the
// basePath-prefixing logic lives in the default loader, which
// unoptimized mode bypasses entirely. Same fix as FilmScene.tsx /
// DigitalCityScene.tsx.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function SiteHeader() {
  return (
    <header className="flex flex-col items-center gap-3 px-6 py-5 text-center sm:py-6">
      <Link href="/" className="inline-block">
        <Image
          src={`${BASE_PATH}/resources/logo.png`}
          alt={site.name}
          width={1326}
          height={209}
          priority
          className="h-14 w-auto sm:h-20"
        />
      </Link>
      <SiteNav />
    </header>
  );
}
