import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.opencami.app',
  appName: 'OpenCami',
  // Point to the deployed TanStack Start instance.
  // OpenCami's API routes (src/routes/api/*) run server-side using Node.js
  // WebSocket + crypto, so we can't build a pure static SPA. Instead, the
  // native shell loads the live web app and gains access to native APIs
  // (push notifications, haptics, etc.) via Capacitor plugins.
  server: {
    url: 'https://openclaw-server.tail8a9ea9.ts.net:3001',
    cleartext: false,
  },
  // Fallback webDir is required by the CLI even when using server.url.
  // We point it at the SSR client build output which always exists after
  // `npm run build`.
  webDir: 'dist/client',
  plugins: {
    Keyboard: {
      // Resize the <body> when the soft keyboard appears – better for chat UX
      // than the default "native" mode which pushes the webview up.
      resize: 'body' as const,
    },
    SplashScreen: {
      backgroundColor: '#0a0a0a',
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  android: {
    // Use https scheme so cookies / localStorage / service-workers behave
    // like a normal browser.
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'https',
  },
}

export default config
