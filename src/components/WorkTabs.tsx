import Link from "next/link";

const TABS = [
  { href: "/", label: "Film", key: "film" },
  { href: "/digital", label: "Digital", key: "digital" },
] as const;

export default function WorkTabs({ active }: { active: "film" | "digital" }) {
  return (
    <div className="mb-8 flex items-center justify-center px-6 text-xs tracking-[0.2em] uppercase sm:px-12">
      {TABS.map((tab, i) => (
        <span key={tab.key} className="flex items-center">
          {i > 0 && <span className="mx-3 text-muted">/</span>}
          <Link
            href={tab.href}
            className={
              tab.key === active
                ? "text-foreground"
                : "text-muted hover:text-foreground"
            }
          >
            {tab.label}
          </Link>
        </span>
      ))}
    </div>
  );
}
