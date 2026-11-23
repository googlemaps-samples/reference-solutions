import TravelComparatorApp from '@/components/TravelComparatorApp';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const rawKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    '';

  const apiKey =
    rawKey && rawKey !== 'your_google_maps_api_key_here' ? rawKey : '';

  return <TravelComparatorApp apiKey={apiKey} />;
}
