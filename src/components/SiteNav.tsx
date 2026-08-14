"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/work", label: "Work", key: "work" },
  { href: "/about", label: "About", key: "about" },
] as const;

// Plain "Work / About" text. The current page always stays underlined/
// bright (text-foreground); the other link brightens and underlines only
// on hover — a CSS-driven underline that grows in from the left via a
// scaled pseudo-element. Neither is "active" on the home page itself
// (the eye) — that's reached via the logo, not one of these two.
export default function SiteNav() {
  const pathname = usePathname();
  // The home page's own eye cards already cover Work/About as bigger,
  // more obvious targets — showing the same two destinations again up
  // here would just be a redundant second nav on the same screen.
  if (pathname === "/") return null;

  // "/work" and "/work/digital" are both the Work section (film + digital
  // scenes).
  const activeKey = pathname === "/about" ? "about" : pathname.startsWith("/work") ? "work" : null;

  return (
    <nav className="flex items-center text-sm tracking-[0.2em] uppercase text-muted">
      {/* The eye/home page has no nav link of its own to click back to —
          Work and About both replace it entirely rather than sitting
          alongside it — so this is the one explicit way back, wherever
          you've navigated to. */}
      <Link href="/" className="inline-block py-1 hover:text-foreground">
        ← Home
      </Link>
      <span className="mx-3 text-muted">/</span>
      {LINKS.map((link, i) => {
        const isActive = link.key === activeKey;
        return (
          <span key={link.href} className="flex items-center">
            {i > 0 && <span className="mx-3 text-muted">/</span>}
            <Link
              href={link.href}
              className={`group relative inline-block py-1 hover:text-foreground ${
                isActive ? "text-foreground" : ""
              }`}
            >
              {link.label}
              <span
                className={`absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-200 ease-out group-hover:scale-x-100 ${
                  isActive ? "scale-x-100" : ""
                }`}
              />
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
