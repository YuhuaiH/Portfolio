import theme from "@/data/theme.json";

// The site's palette, in one place — see src/data/theme.json to edit it.
// Consumers that can read a CSS custom property (any Tailwind class, any
// plain CSS) get it for free via the `:root` block layout.tsx generates
// from this same file. This module exists for the few spots that can't:
// WebGL material colors (EyeStage.tsx — three.js needs a real value, not a
// CSS var) and inline styles that need a custom alpha (SiteHeader.tsx's
// drop-shadow glow).
export const THEME = theme;

export function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
