import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Flask API runs separately on :5001 (macOS reserves :5000 for AirPlay).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:5001' } },
});
