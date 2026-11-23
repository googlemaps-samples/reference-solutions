import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Field Workforce Geofenced Attendance & Site Audit Router | Austin, TX',
  description:
    'Austin field workforce geofenced attendance check-in with Terra Draw polygon zones, Geocoding API v4 reverse geocoding, Places API (New) site discovery, and Routes API v2 multi-stop waypoint optimization.',
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
