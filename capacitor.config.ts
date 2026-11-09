import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.niyyah.prayer',
  appName: 'Niyyah',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#FBF7F0',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_niyyah',
      iconColor: '#14503E',
    },
  },
};

export default config;
