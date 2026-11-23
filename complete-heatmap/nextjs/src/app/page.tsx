import { StormWatchDashboard } from '@/components/StormWatchDashboard';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const dynamicEnvKey = 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY';
  const apiKey = (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env[dynamicEnvKey] ||
    ''
  ).trim();
  const sanitizedKey =
    apiKey && apiKey !== 'your_google_maps_api_key_here' ? apiKey : '';

  return <StormWatchDashboard apiKey={sanitizedKey} />;
}
