import { StoreLocatorApp } from '@/components/StoreLocatorApp';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const env = process.env;
  const apiKey =
    env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY']?.trim() ||
    env['GOOGLE_MAPS_API_KEY']?.trim() ||
    '';

  return <StoreLocatorApp apiKey={apiKey} />;
}
