import RealEstateExplorer from '@/components/RealEstateExplorer';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    '';

  const sanitizedKey = apiKey === 'your_google_maps_api_key_here' ? '' : apiKey;

  return <RealEstateExplorer apiKey={sanitizedKey} />;
}
