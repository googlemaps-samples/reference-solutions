import { FleetDashboardClient } from '@/components/FleetDashboardClient';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();

  return <FleetDashboardClient apiKey={apiKey} />;
}
