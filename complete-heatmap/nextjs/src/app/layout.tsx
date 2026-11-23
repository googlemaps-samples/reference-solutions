import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Miami StormWatch — Disaster Hazard Heatmap & Safe Shelter Router',
  description:
    'Civic flood/storm hazard monitor, citizen incident reporter, and flood-avoidance emergency shelter evacuation router for Miami, FL.',
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
