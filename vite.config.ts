import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Use the provided API key as the default fallback
  const API_KEY = env.VITE_API_KEY || env.API_KEY || "AIzaSyD9k0TN-dSZGsNPPXJGS_my_0MIcgven7M";

  return {
    plugins: [react()],
    define: {
      // Inject API key into the code during build
      'process.env.API_KEY': JSON.stringify(API_KEY)
    }
  };
});