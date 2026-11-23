import { AlertTriangle, ExternalLink, KeyRound } from 'lucide-react';

export function SetupNotice() {
  return (
    <div className="setup-notice-shell">
      <div className="setup-notice-card">
        <div className="setup-icon-wrap">
          <KeyRound size={28} />
        </div>
        <h1>Google Maps Platform API Key Required</h1>
        <p className="setup-lead">
          Configure <code>VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
          <code>.env.local</code> to launch the Seattle EV &amp; Roadside
          Dispatch dashboard.
        </p>

        <div className="setup-steps">
          <h2>Quick Start with a Free Maps Demo Key</h2>
          <ol>
            <li>
              Open the{' '}
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Maps Demo Key Portal <ExternalLink size={13} />
              </a>{' '}
              and sign in with any Google account (no billing card required).
            </li>
            <li>Accept the Maps Demo Project Terms and copy your key.</li>
            <li>
              Create <code>.env.local</code> in the project root with:
              <pre className="setup-code">
                VITE_GOOGLE_MAPS_API_KEY=your_copied_key_here
              </pre>
            </li>
            <li>
              Restart the Vite server (<code>npm run dev</code> or{' '}
              <code>npm run build &amp;&amp; npm run preview</code>).
            </li>
          </ol>
        </div>

        <div className="setup-warning">
          <AlertTriangle size={16} />
          <span>
            For production deployments, enable Maps JavaScript API, Places API
            (New), Routes API, and Geocoding API in Google Cloud Console and
            restrict your key by HTTP referrer.
          </span>
        </div>
      </div>
    </div>
  );
}
