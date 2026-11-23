import { DeliveryTrackerApp } from '@/components/DeliveryTrackerApp';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  return <DeliveryTrackerApp apiKey={apiKey} />;
}
