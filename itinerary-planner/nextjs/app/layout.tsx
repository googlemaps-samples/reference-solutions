import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Multi-Day Trip Itinerary Planner, Hotels & Time Zone Hub',
  description:
    'Interactive multi-day city trip planner, live Places API (New) discovery, Time Zone Hub, Routes API optimization, and Street View preview powered by Google Maps Platform.',
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
