import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '127.0.0.1'
	},
	preview: {
		host: '127.0.0.1'
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules/@luma.gl') || id.includes('node_modules/@deck.gl')) {
						return 'deckgl';
					}
				}
			}
		}
	}
});
