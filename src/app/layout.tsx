import type { Metadata } from "next";
import { Cardo, Playfair_Display } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PageTransition from "@/components/PageTransition";
import SceneHeader from "@/components/SceneHeader";
import { FilmFocusProvider } from "@/components/FilmFocusProvider";
import { getPhotos, getFilmRolls } from "@/lib/photos";
import site from "@/data/site.json";
import "./globals.css";

const cardo = Cardo({
  variable: "--font-cardo",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${site.name} — ${site.role}`,
  description: `${site.role} portfolio of ${site.name}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const photos = getPhotos();
  const filmRolls = getFilmRolls(photos);
  const digitalCount = photos.filter((photo) => photo.type === "digital").length;

  return (
    <html
      lang="en"
      className={`${cardo.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <FilmFocusProvider>
          <main className="relative flex-1">
            <SceneHeader filmRolls={filmRolls} digitalCount={digitalCount} />
            <PageTransition>{children}</PageTransition>
          </main>
        </FilmFocusProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
