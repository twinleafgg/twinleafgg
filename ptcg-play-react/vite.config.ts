import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = (env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

  return {
    // ptcg-server (and some transitive code) references Node's `global`; browsers only have globalThis.
    define: {
      global: 'globalThis',
    },
    plugins: [react()],
    server: {
      proxy: {
        '/v1': { target: apiTarget, changeOrigin: true },
        '/socket.io': { target: apiTarget, ws: true, changeOrigin: true },
        // Server-hosted static assets referenced by appConfig.apiUrl. Keeping
        // these on the dev origin lets the app run CORS-free on any dev port.
        '/avatars': { target: apiTarget, changeOrigin: true },
        '/sleeves': { target: apiTarget, changeOrigin: true },
        '/deck-boxes': { target: apiTarget, changeOrigin: true },
        '/coins': { target: apiTarget, changeOrigin: true },
        '/scans': { target: apiTarget, changeOrigin: true },
      },
    },
    optimizeDeps: {
      include: ['ptcg-server'],
    },
  };
});
