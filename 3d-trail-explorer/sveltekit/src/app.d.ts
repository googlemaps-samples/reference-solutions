/// <reference types="@sveltejs/kit" />
/// <reference types="google.maps" />

import type { HTMLAttributes } from 'svelte/elements';

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
  }
}

declare module 'svelte/elements' {
  interface SvelteHTMLElements {
    'gmp-map-3d': HTMLAttributes<HTMLElement> & {
      mode?: string;
      center?: string;
      range?: string | number;
      tilt?: string | number;
      heading?: string | number;
      'gesture-handling'?: string;
      'default-ui-hidden'?: boolean | string;
      'internal-usage-attribution-ids'?: string;
    };
  }
}

export {};
