import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NYC Spatial Intelligence | Enterprise GIS Workbench',
  description:
    'Enterprise Web GIS spatial analytics workbench centered on New York City with Google Maps Platform, GeoJSON capacity districts, deck.gl analytics, Terra Draw, Elevation API, and Places API (New).',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
