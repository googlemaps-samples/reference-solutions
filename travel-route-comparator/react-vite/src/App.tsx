import { APIProvider } from '@vis.gl/react-google-maps';
import { RouteComparatorApp } from './components/RouteComparatorApp';
import './App.css';

export function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return (
      <div className="missing-key-shell">
        <div className="missing-key-card">
          <h1>Google Maps API Key Required</h1>
          <p>
            Configure <code>VITE_GOOGLE_MAPS_API_KEY</code> in your local{' '}
            <code>.env.local</code> file to load the Denver–Boulder Multi-Modal
            Commute Comparator &amp; Trail Elevation Tracker.
          </p>
          <ol>
            <li>
              Copy <code>.env.example</code> to <code>.env.local</code>.
            </li>
            <li>
              Generate a free zero-billing key via the{' '}
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                target="_blank"
                rel="noreferrer"
              >
                Maps Demo Key quickstart
              </a>{' '}
              or Google Cloud Console.
            </li>
            <li>
              Set <code>VITE_GOOGLE_MAPS_API_KEY=&lt;your_key&gt;</code> and
              restart the dev/preview server.
            </li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language="en" region="US">
      <RouteComparatorApp />
    </APIProvider>
  );
}

export default App;
