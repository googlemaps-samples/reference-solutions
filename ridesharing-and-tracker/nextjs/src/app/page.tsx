import { RideshareWorkspace } from '@/components/RideshareWorkspace';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  return <RideshareWorkspace initialApiKey={apiKey} />;
}
