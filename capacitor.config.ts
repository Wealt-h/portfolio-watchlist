import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tryaccrue.app',
  appName: 'Accrue',
  webDir: 'build',
  server: {
    // Explicitly allow the app's webview to make network requests to the
    // live Vercel deployment — without this, Capacitor's webview can block
    // outgoing requests to domains it hasn't been told to trust, which is
    // what was causing "Load failed" errors on the price-fetch calls.
    allowNavigation: ['portfolio-watchlist-cumx.vercel.app']
  }
};

export default config;
