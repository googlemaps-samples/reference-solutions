import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fulton Market Express — On-Demand Chicago Delivery & Live Tracking',
  description:
    'End-to-end Chicago restaurant and grocery delivery checkout, Address Validation API deliverability check, polygon/8km zone verification, Routes API ETA, live courier tracking, and Maps Static API receipt.',
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
