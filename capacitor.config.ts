// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cornellnotes.app',
  appName: 'Cornell Notes',
  webDir: 'dist', // <--- ESSA LINHA É A MAIS IMPORTANTE
  server: {
    androidScheme: 'https'
  }
};

export default config;