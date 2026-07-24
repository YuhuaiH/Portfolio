import Link from "next/link";
import site from "@/data/site.json";

const links = [
  { href: "/", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  return (
    <header className="flex flex-col items-center gap-4 px-6 py-12 text-center sm:py-16">
      <Link
        href="/"
        className="font-heading text-3xl tracking-wide sm:text-4xl"
      >
        {site.name}
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
