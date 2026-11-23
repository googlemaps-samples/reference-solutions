import { ItineraryWorkspace } from '@/components/ItineraryWorkspace';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    '';

  return <ItineraryWorkspace apiKey={apiKey} />;
}
