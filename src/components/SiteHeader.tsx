import Image from "next/image";
import Link from "next/link";
import site from "@/data/site.json";

// next/image never applies basePath to a hardcoded src when
// images.unoptimized is on (required for static export) — the
// basePath-prefixing logic lives in the default loader, which
// unoptimized mode bypasses entirely. Same fix as FilmScene.tsx /
// DigitalCityScene.tsx.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const links = [
  { href: "/", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  return (
    <header className="flex flex-col items-center gap-2 px-6 py-6 text-center sm:py-8">
      <Link href="/" className="inline-block">
        <Image
          src={`${BASE_PATH}/resources/logo.png`}
          alt={site.name}
          width={1326}
          height={209}
          priority
          className="h-9 w-auto sm:h-11"
        />
      </Link>
      <nav className="flex items-center text-xs tracking-[0.2em] uppercase text-muted">
        {links.map((link, i) => (
          <span key={link.href} className="flex items-center">
            {i > 0 && <span className="mx-3 text-muted">/</span>}
            <Link href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          </span>
        ))}
      </nav>
    </header>
  );
}
