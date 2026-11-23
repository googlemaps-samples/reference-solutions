import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hyperlocal Neighborhood Directory & Spot Mapper · Central London',
  description:
    'Discover Central London neighborhoods within a 5km radius using Google Maps Platform Places API (New), Geocoding API, and Advanced Markers.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
