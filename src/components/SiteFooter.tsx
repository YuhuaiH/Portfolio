import site from "@/data/site.json";

export default function SiteFooter() {
  return (
    <footer className="flex flex-col items-center gap-3 px-6 py-12 text-center text-xs tracking-[0.15em] text-muted uppercase">
      <div className="flex gap-4">
        {site.social.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </div>
      <div>
        © {new Date().getFullYear()} {site.name}
      </div>
    </footer>
  );
}
