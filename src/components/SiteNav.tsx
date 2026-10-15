"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavigationPending } from "./NavigationPendingProvider";
import { SECTIONS } from "@/lib/works";

// Every section by name, then About — the same five destinations as the
// home page eye's tickets.
const LINKS = [
  ...SECTIONS.map(({ href, label, key }) => ({ href, label, key })),
  { href: "/about", label: "About", key: "about" },
];

// Plain "Projects / Photography / … / About" text. The current page always stays underlined/
// bright (text-foreground); the other link brightens and underlines only
// on hover — a CSS-driven underline that grows in from the left via a
// scaled pseudo-element. Neither is "active" on the home page itself
// (the eye) — that's reached via the logo, not one of these two.
export default function SiteNav() {
  const pathname = usePathname();
  const { startNavigating } = useNavigationPending();
  // The home page's eye tickets already cover every destination as
  // bigger, more obvious targets — showing them again up here would just
  // be a redundant second nav on the same screen.
  if (pathname === "/") return null;

  // Prefix match, so a section stays lit on its sub-pages too —
  // "/photography/digital", "/projects/<slug>", etc.
  const activeKey =
    LINKS.find((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))?.key ??
    null;

  return (
    // flex-wrap: six links at this tracking don't fit one line on a phone.
    <nav className="flex flex-wrap items-center justify-center gap-y-1 font-pixel text-xs tracking-[0.15em] uppercase text-muted">
      {/* The eye/home page has no nav link of its own to click back to —
          Work and About both replace it entirely rather than sitting
          alongside it — so this is the one explicit way back, wherever
          you've navigated to. */}
      <Link href="/" className="inline-block py-1 hover:text-accent-bright" onClick={startNavigating}>
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
              // pathname !== link.href, not !isActive — "/photography" and
              // "/photography/digital" share activeKey ("photography"), so isActive
              // alone can't tell a genuine navigation between those two
              // apart from clicking the tab you're already exactly on
              // (which never fires a pathname change, and would leave
              // `pending` stuck true forever if this fired for it too).
              onClick={pathname !== link.href ? startNavigating : undefined}
              className={`group relative inline-block py-1 hover:text-accent-bright ${
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
