import { env } from '$env/dynamic/public';

export const GMP_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

export function getServerApiKey(): string | null {
	const raw = env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
	if (!raw || raw === 'your_google_maps_api_key_here') {
		return null;
	}
	return raw;
}
