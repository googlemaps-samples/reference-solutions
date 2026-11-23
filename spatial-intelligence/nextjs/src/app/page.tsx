import { GisWorkbench } from '@/components/GisWorkbench';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  return <GisWorkbench apiKey={apiKey} />;
}
