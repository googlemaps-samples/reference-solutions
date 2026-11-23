import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'MetroGrid NYC | Multi-Branch Store, ATM & Inventory Locator',
  description:
    'Split-screen New York City flagship store, express kiosk, and 24/7 ATM locator powered by Google Maps Platform Maps JS API, Places API (New), and Routes API.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
