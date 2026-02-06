import { URL, fileURLToPath } from 'node:url'

// devtools removed
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// nitro plugin removed (tanstackStart handles server runtime)
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

const config = defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3001,
    allowedHosts: ['openclaw-server.tail8a9ea9.ts.net', 'opencami.tail8a9ea9.ts.net'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    // devtools(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    // PWA service worker is registered via custom script in __root.tsx
    // Service worker file is in public/sw.js
  ],
})

export default config
