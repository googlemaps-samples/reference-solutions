import React from 'react';
import NeighborhoodExplorer from './components/NeighborhoodExplorer';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
  return <NeighborhoodExplorer apiKey={apiKey} />;
}
