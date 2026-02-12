# Contributing

> Development guide for OpenCami contributors.

Thank you for considering contributing to OpenCami! 🦎

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Upstream Workflow](#upstream-workflow)
- [Documentation](#documentation)
- [Community](#community)

---

## Development Setup

### Prerequisites

- **Node.js 18+** and npm
- **Git**
- **OpenClaw Gateway** running locally
- IDE with TypeScript support (VS Code recommended)

### Clone and Install

```bash
# Fork the repo on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/opencami.git
cd opencami

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Configure Environment

Edit `.env.local`:

```bash
# Required
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
CLAWDBOT_GATEWAY_TOKEN=your_token_here

# Optional for full feature testing
FILES_ROOT=/path/to/test/workspace
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
```

### Run Development Server

```bash
npm run dev
```

Opens at `http://localhost:3002` with hot module replacement.

> **Port note:** The `npm run dev` script uses port 3002. If running Vite directly, it targets 3003 and auto-falls back to the next free port.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run check` | Format + lint fix |
| `npm run tauri:dev` | Start Tauri desktop dev |
| `npm run tauri:build` | Build Tauri desktop app |

---

## Project Structure

```
opencami/
├── bin/                      # CLI entry point
│   └── opencami.js
├── docs/                     # Documentation
├── public/                   # Static assets
│   ├── icons/               # App icons
│   ├── manifest.json        # PWA manifest
│   └── service-worker.js    # PWA service worker
├── src/
│   ├── __tests__/           # Test setup and utilities
│   ├── components/          # Shared React components
│   │   ├── ui/              # Base UI components (button, dialog, etc.)
│   │   ├── prompt-kit/      # Chat-specific components
│   │   └── icons/           # Icon components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and helpers
│   ├── routes/              # TanStack Router pages + API routes
│   │   ├── api/             # Server API endpoints
│   │   ├── chat/            # Chat routes
│   │   └── files/           # File explorer routes
│   ├── screens/             # Feature modules
│   │   ├── chat/            # Chat feature (main)
│   │   ├── files/           # File explorer feature
│   │   ├── settings/        # Settings feature
│   │   ├── agents/          # Agent manager
│   │   └── bots/            # Bot configuration
│   ├── server/              # Server-side modules
│   │   ├── gateway.ts       # Gateway connection
│   │   ├── filesystem.ts    # File operations
│   │   └── path-utils.ts    # Path security
│   ├── router.tsx           # Router configuration
│   ├── routeTree.gen.ts     # Generated route tree
│   └── index.css            # Global styles
├── src-tauri/               # Tauri desktop app
├── android/                 # Capacitor Android app
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/components/` | Reusable UI components |
| `src/hooks/` | Custom React hooks |
| `src/screens/` | Feature-level modules |
| `src/server/` | Server-side code (runs on Node.js) |
| `src/routes/api/` | API endpoints |
| `src/lib/` | Shared utilities |

---

## Code Style

### General Principles

1. **Function declarations** over arrow functions for top-level exports
2. **TypeScript** — use types, avoid `any`
3. **Tailwind CSS** — no inline styles or CSS modules
4. **Descriptive names** — prefer clarity over brevity
5. **Small components** — single responsibility principle

### Component Example

```tsx
// ✅ Good
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  content: string
  role: 'user' | 'assistant'
  className?: string
}

export function ChatMessage({ content, role, className }: ChatMessageProps) {
  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        role === 'user' ? 'bg-primary-100' : 'bg-surface',
        className
      )}
    >
      <span className="text-sm text-primary-800">{content}</span>
    </div>
  )
}
```

```tsx
// ❌ Avoid
export const ChatMessage = ({ content, role }: any) => (
  <div style={{ display: 'flex', gap: '12px', padding: '16px' }}>
    <span>{content}</span>
  </div>
)
```

### Hook Example

```tsx
// ✅ Good
import { useState, useCallback } from 'react'

export function useToggle(initial = false) {
  const [value, setValue] = useState(initial)
  
  const toggle = useCallback(() => setValue(v => !v), [])
  const setTrue = useCallback(() => setValue(true), [])
  const setFalse = useCallback(() => setValue(false), [])
  
  return { value, toggle, setTrue, setFalse }
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `ChatMessage.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-chat-settings.ts`)
- Utilities: `kebab-case.ts` (e.g., `path-utils.ts`)
- Types: In same file or `types.ts`

### Import Order

```tsx
// 1. React/external libraries
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Internal components
import { Button } from '@/components/ui/button'
import { ChatMessage } from './components/chat-message'

// 3. Hooks and utilities
import { useChatSettings } from '@/hooks/use-chat-settings'
import { cn } from '@/lib/utils'

// 4. Types
import type { Message } from './types'
```

---

## Testing

### Current State

We use Vitest for testing. Test coverage is growing — contributions welcome!

### Running Tests

```bash
# Run all tests
npm run test

# Run with watch mode
npm run test -- --watch

# Run specific file
npm run test -- src/lib/utils.test.ts
```

### Writing Tests

```tsx
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
  
  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })
})
```

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile viewport (responsive)
- [ ] Slow network (Dev Tools → Network → Slow 3G)
- [ ] Dark mode
- [ ] Light mode
- [ ] With and without API keys

---

## Pull Request Process

### Branch Naming

Use semantic prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat/` | New features | `feat/push-notifications` |
| `fix/` | Bug fixes | `fix/search-crash` |
| `docs/` | Documentation | `docs/deployment-guide` |
| `refactor/` | Code cleanup | `refactor/chat-hooks` |
| `chore/` | Build/deps/tooling | `chore/update-deps` |
| `perf/` | Performance | `perf/lazy-load-dialogs` |

### Before Submitting

1. **Test locally** — dev mode AND production build
2. **Run checks** — `npm run check`
3. **Update docs** — if you added a feature
4. **Write tests** — if applicable

### PR Template

Your PR should include:

```markdown
## Summary
Brief description of what this PR does.

## Motivation
Why is this change needed?

## Changes
- Change 1
- Change 2

## Testing
How did you test this?

## Screenshots
(if UI change)
```

### Review Process

1. Open PR against `main`
2. Maintainers review within 3-5 days
3. Address feedback in new commits (don't force-push during review)
4. Once approved, we squash-merge to main

### Adding Dependencies

**Please ask first** before adding npm packages:

1. Open an issue describing the need
2. Explain why existing solutions won't work
3. Wait for maintainer approval

We prefer keeping the bundle small.

---

## Upstream Workflow

OpenCami is a fork of [WebClaw](https://github.com/ibelick/webclaw). We contribute generic features back upstream.

### Contributing to WebClaw (Upstream)

If your feature is **generic** (not OpenClaw-specific):

```bash
# Add upstream remote (once)
git remote add upstream https://github.com/ibelick/webclaw.git
git fetch upstream

# Create branch from upstream/main
git checkout -b feat/your-feature upstream/main

# Make MINIMAL changes (no OpenClaw-specific code)
# Commit and push to YOUR fork
git push origin feat/your-feature

# Open PR to ibelick/webclaw
gh pr create --repo ibelick/webclaw
```

### Syncing Upstream Changes

Periodically merge upstream updates:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### What Goes Upstream?

| Upstream ✅ | OpenCami-only ❌ |
|-------------|------------------|
| UI components | Gateway integration |
| Theme system | OpenClaw-specific features |
| Keyboard shortcuts | Persona picker |
| Export functionality | Agent manager |
| Mobile gestures | File explorer (already PRed) |

---

## Documentation

### Where to Document

| Change Type | Location |
|-------------|----------|
| New feature | `docs/FEATURES.md` + README one-liner |
| Architecture | `docs/ARCHITECTURE.md` |
| Deployment | `docs/DEPLOYMENT.md` |
| API changes | `docs/API.md` |
| Breaking changes | `CHANGELOG.md` |

### Documentation Style

- **Concise and practical** — users want to get things done
- **Code examples** — show, don't just tell
- **Relative links** — keep docs navigation easy
- **Tables** — for reference information

### Example

```markdown
### 🔊 Text-to-Speech

Listen to AI responses with voice synthesis.

**Providers:**
1. ElevenLabs (best quality)
2. OpenAI TTS
3. Edge TTS (free fallback)

**Usage:**
1. Enable in Settings → Voice
2. Click 🔊 on any assistant message

**Configuration:**
```bash
ELEVENLABS_API_KEY=your_key
```
```

---

## Community

### Communication Channels

- **GitHub Issues** — Bug reports, feature requests
- **GitHub Discussions** — Questions, ideas, show-and-tell
- **Pull Requests** — Code contributions

### Code of Conduct

Be respectful, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

**In summary:**
- Be welcoming to newcomers
- Respect differing viewpoints
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy

### Getting Help

- **Stuck on setup?** — Open a Discussion
- **Found a bug?** — Open an Issue
- **Have a feature idea?** — Open an Issue first to discuss
- **Want to contribute?** — Look for `good first issue` labels

---

## Recognition

Contributors are:
- Listed in release notes
- Credited in README (for major features)
- Appreciated forever 💚

**Current major contributors:**
- [@ibelick](https://github.com/ibelick) — WebClaw creator
- [@balin-ar](https://github.com/balin-ar) — File Explorer
- [@deblanco](https://github.com/deblanco) — Dockerfile

Thank you for helping make OpenCami better! 🦎

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) — Technical deep dive
- [Features](./FEATURES.md) — Feature documentation
- [Deployment](./DEPLOYMENT.md) — Self-hosting guide
- [API Reference](./API.md) — Gateway integration
