const socialLinks = [
  { href: "https://instagram.com/", label: "Instagram" },
  { href: "https://linkedin.com/", label: "LinkedIn" },
];

export default function SiteFooter() {
  return (
    <footer className="flex flex-col items-center gap-3 px-6 py-12 text-center text-xs tracking-[0.15em] text-muted uppercase">
      <div className="flex gap-4">
        {socialLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </div>
      <div>© {new Date().getFullYear()} Your Name</div>
    </footer>
  );
}
