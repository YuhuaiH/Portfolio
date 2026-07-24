import Link from "next/link";

const links = [
  { href: "/", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-6 sm:px-12">
      <Link href="/" className="text-sm font-semibold tracking-widest uppercase">
        Your Name
      </Link>
      <nav className="flex gap-6 text-sm">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:opacity-60">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
