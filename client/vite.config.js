import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the API runs on :5000; requests to /api are proxied so CORS is not needed.
    proxy: { '/api': 'http://localhost:5000' },
  },
});
