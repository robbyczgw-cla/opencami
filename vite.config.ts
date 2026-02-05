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
    allowedHosts: ['YOUR_OPENCLAW_SERVER.ts.net', 'YOUR_OPENCAMI_SERVER.ts.net'],
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
  ],
})

export default config
