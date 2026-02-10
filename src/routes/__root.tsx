import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import appCss from '../styles.css?url'

const swRegisterScript = `
(() => {
  // Skip PWA service worker inside Capacitor native shell — they conflict
  // with the native networking layer and caching.
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Auto-update: check for updates periodically
          setInterval(() => reg.update(), 60 * 60 * 1000); // every hour
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  // New version activated, could notify user here
                  console.log('[SW] New version activated');
                }
              });
            }
          });
        })
        .catch((err) => console.warn('[SW] Registration failed:', err));
    });
  }
})()
`

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem('chat-settings')
    let theme = 'system'
    if (stored) {
      const parsed = JSON.parse(stored)
      const storedTheme = parsed?.state?.settings?.theme
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system' || storedTheme === 'chameleon') {
        theme = storedTheme
      }
    }
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      root.classList.remove('light', 'dark', 'system', 'chameleon')
      root.classList.add(theme)
      if (theme === 'system' && media.matches) {
        root.classList.add('dark')
      }
    }
    apply()
    media.addEventListener('change', () => {
      if (theme === 'system') apply()
    })
  } catch {}
})()
`

const tauriDetectScript = `
(() => {
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
    document.documentElement.classList.add('tauri')
  }
})()
`

const textSizeScript = `
(() => {
  try {
    const stored = localStorage.getItem('opencami-text-size')
    const allowed = new Set(['14px', '16px', '18px', '20px'])
    const value = allowed.has(stored) ? stored : '16px'
    document.documentElement.style.setProperty('--opencami-text-size', value)
  } catch {}
})()
`

const fontFamilyScript = `
(() => {
  try {
    const stored = localStorage.getItem('opencami-font-family')
    const map = {
      'system': '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'inter': '"Inter", sans-serif',
      'ibm-plex-sans': '"IBM Plex Sans", sans-serif',
      'jetbrains-mono': '"JetBrains Mono", monospace',
      'merriweather': '"Merriweather", serif',
      'roboto': '"Roboto", sans-serif',
    }
    const value = map[stored] || map.system
    document.documentElement.style.setProperty('--opencami-font-family', value)
  } catch {}
})()
`

const densityScript = `
(() => {
  try {
    const stored = localStorage.getItem('opencami-density')
    const value = stored === 'compact' || stored === 'spacious' || stored === 'comfortable'
      ? stored
      : 'comfortable'
    const root = document.documentElement
    root.style.setProperty('--opencami-density', value)

    if (value === 'compact') {
      root.style.setProperty('--opencami-msg-padding-y', '0.25rem')
      root.style.setProperty('--opencami-msg-gap', '0.25rem')
      root.style.setProperty('--opencami-user-bubble-py', '0.4rem')
    } else if (value === 'spacious') {
      root.style.setProperty('--opencami-msg-padding-y', '1.25rem')
      root.style.setProperty('--opencami-msg-gap', '1rem')
      root.style.setProperty('--opencami-user-bubble-py', '1rem')
    } else {
      root.style.setProperty('--opencami-msg-padding-y', '0.75rem')
      root.style.setProperty('--opencami-msg-gap', '0.5rem')
      root.style.setProperty('--opencami-user-bubble-py', '0.625rem')
    }
  } catch {}
})()
`

const accentColorScript = `
(() => {
  try {
    const stored = localStorage.getItem('opencami-accent-color')
    const map = {
      green: { accent: '#22c55e', hover: '#16a34a', light: 'rgba(34, 197, 94, 0.10)' },
      blue: { accent: '#3b82f6', hover: '#2563eb', light: 'rgba(59, 130, 246, 0.10)' },
      purple: { accent: '#8b5cf6', hover: '#7c3aed', light: 'rgba(139, 92, 246, 0.10)' },
      orange: { accent: '#f97316', hover: '#ea580c', light: 'rgba(249, 115, 22, 0.10)' },
      pink: { accent: '#ec4899', hover: '#db2777', light: 'rgba(236, 72, 153, 0.10)' },
      red: { accent: '#ef4444', hover: '#dc2626', light: 'rgba(239, 68, 68, 0.10)' },
      cyan: { accent: '#06b6d4', hover: '#0891b2', light: 'rgba(6, 182, 212, 0.10)' },
      yellow: { accent: '#eab308', hover: '#ca8a04', light: 'rgba(234, 179, 8, 0.10)' },
    }
    const selected = map[stored] || map.green
    const root = document.documentElement
    root.style.setProperty('--opencami-accent', selected.accent)
    root.style.setProperty('--opencami-accent-hover', selected.hover)
    root.style.setProperty('--opencami-accent-light', selected.light)
  } catch {}
})()
`

const chatWidthScript = `
(() => {
  try {
    const stored = localStorage.getItem('opencami-chat-width')
    const map = {
      narrow: '640px',
      medium: '800px',
      wide: '1000px',
      full: '100%',
    }
    const value = map[stored] || map.wide
    document.documentElement.style.setProperty('--opencami-chat-width', value)
  } catch {}
})()
`

const sidebarWidthScript = `
(() => {
  try {
    const stored = localStorage.getItem('opencami-sidebar-width')
    const map = {
      compact: '200px',
      normal: '260px',
      wide: '320px',
      xl: '400px',
    }
    const value = map[stored] || map.normal
    document.documentElement.style.setProperty('--opencami-sidebar-width', value)
  } catch {}
})()
`

const bubbleStyleScript = `
(() => {
  try {
    const stored = localStorage.getItem('opencami-bubble-style')
    const value = stored === 'bubbles' || stored === 'minimal' || stored === 'default'
      ? stored
      : 'default'
    document.documentElement.setAttribute('data-opencami-bubble-style', value)
  } catch {}
})()
`

function NotFoundRedirect() {
  if (typeof window !== 'undefined') {
    window.location.href = '/chat/main'
  }
  return null
}

export const Route = createRootRoute({
  notFoundComponent: NotFoundRedirect,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      },
      {
        title: 'OpenCami',
      },
      {
        name: 'description',
        content: 'a fast web client for OpenClaw',
      },
      {
        property: 'og:image',
        content: '/cover.webp',
      },
      {
        property: 'og:image:type',
        content: 'image/webp',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:image',
        content: '/cover.webp',
      },
      // PWA - Theme color
      {
        name: 'theme-color',
        content: '#0a0a0a',
      },
      // PWA - Apple iOS meta tags
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'OpenCami',
      },
      // PWA - Android meta tags
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      // PWA - Apple touch icon
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon-180x180.png',
      },
      // PWA - Manifest
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),

  shellComponent: RootDocument,
  component: RootLayout,
})

const queryClient = new QueryClient()

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: tauriDetectScript }} />
        <script dangerouslySetInnerHTML={{ __html: textSizeScript }} />
        <script dangerouslySetInnerHTML={{ __html: fontFamilyScript }} />
        <script dangerouslySetInnerHTML={{ __html: densityScript }} />
        <script dangerouslySetInnerHTML={{ __html: accentColorScript }} />
        <script dangerouslySetInnerHTML={{ __html: chatWidthScript }} />
        <script dangerouslySetInnerHTML={{ __html: sidebarWidthScript }} />
        <script dangerouslySetInnerHTML={{ __html: bubbleStyleScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: swRegisterScript }} />
        <HeadContent />
      </head>
      <body>
        <div className="root">{children}</div>
        <Scripts />
      </body>
    </html>
  )
}
