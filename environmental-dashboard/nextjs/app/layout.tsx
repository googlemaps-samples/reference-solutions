import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Hyperlocal Weather, Air Quality, Pollen & Solar Dashboard | Google Maps Platform',
  description:
    'Inspect hyperlocal weather forecasts, real-time AQI & pollutant health guidance, tree/grass/weed pollen levels, and rooftop solar potential anywhere on Earth.',
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
