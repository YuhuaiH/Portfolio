export type Photo = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};

// Placeholder gallery. Replace `src` with images from /public/photos/
// (e.g. "/photos/my-shot.jpg") once you add your own work.
export const photos: Photo[] = [
  { id: "1", src: "https://picsum.photos/seed/portfolio1/800/1000", alt: "Placeholder photo 1", width: 800, height: 1000 },
  { id: "2", src: "https://picsum.photos/seed/portfolio2/800/600", alt: "Placeholder photo 2", width: 800, height: 600 },
  { id: "3", src: "https://picsum.photos/seed/portfolio3/800/1200", alt: "Placeholder photo 3", width: 800, height: 1200 },
  { id: "4", src: "https://picsum.photos/seed/portfolio4/800/600", alt: "Placeholder photo 4", width: 800, height: 600 },
  { id: "5", src: "https://picsum.photos/seed/portfolio5/800/1000", alt: "Placeholder photo 5", width: 800, height: 1000 },
  { id: "6", src: "https://picsum.photos/seed/portfolio6/800/1000", alt: "Placeholder photo 6", width: 800, height: 1000 },
];
