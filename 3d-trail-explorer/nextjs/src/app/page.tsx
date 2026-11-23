import { TrailExplorerApp } from '@/components/TrailExplorerApp';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'] ||
    '';
  return <TrailExplorerApp apiKey={apiKey} />;
}
