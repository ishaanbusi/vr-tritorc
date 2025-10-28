import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tritorc.vr',
  appName: 'vr-tritorc',
  webDir: 'out', 
  server: {
    androidScheme: 'https'
  }
  
};

export default config;