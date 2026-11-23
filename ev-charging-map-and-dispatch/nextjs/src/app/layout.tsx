import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Seattle EV & Roadside Dispatch | On-Demand Local Services',
  description:
    'Locate nearby EV fast-charging stations and roadside auto repair providers in Seattle with live Routes API driving ETAs, turn-by-turn dispatch polylines, and reverse-geocoded breakdown pinning.',
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
