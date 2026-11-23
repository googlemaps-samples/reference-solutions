import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Denver–Boulder Multi-Modal Route Comparator & Trail Elevation Tracker',
  description:
    'Compare Driving, Cycling, Walking, and Transit routes between Denver and Boulder with Routes API v2, Places API (New), and interactive Elevation API slope profiles.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#f4f7f6] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
