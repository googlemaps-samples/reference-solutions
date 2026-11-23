import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lake Tahoe 3D Trail Explorer | Photorealistic 3D Maps & Camera Tour',
  description:
    'Interactive Photorealistic 3D terrain storytelling and hiking trail explorer in Lake Tahoe powered by Google Maps Platform 3D Maps, Places API (New), and Elevation API.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-slate-950 text-slate-100 antialiased selection:bg-red-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
