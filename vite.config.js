import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        '**/.local/**',
        '**/.private/**',
        '**/android/**',
        '**/ios/**',
        '**/test-results/**',
        '**/playwright-report/**',
      ],
    },
    fs: {
      deny: [
        '.env',
        '.env.*',
        '*.{crt,pem}',
        '**/.git/**',
        '**/.local/**',
        '**/.private/**',
        '**/android/**',
        '**/ios/**',
        '**/capacitor.config.*',
        '**/*.{apk,aab,jks,keystore,key,p12}',
      ],
    },
  },
  test: { environment: 'node', include: ['tests/unit/**/*.test.js'] },
});
