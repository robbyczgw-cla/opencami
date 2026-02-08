# Contributing

Thank you for considering contributing to OpenCami! 🦎

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- OpenClaw Gateway running locally
- Git

### Clone and Install

```bash
# Fork the repo on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/opencami.git
cd opencami

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Gateway credentials
# CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
# CLAWDBOT_GATEWAY_TOKEN=your_token_here
```

### Run Development Server

```bash
npm run dev
```

Open the URL shown in your terminal (`npm run dev` currently serves on `http://localhost:3002`). Vite will hot-reload as you edit.

## Code Style

### General Principles
- **Function declarations** over arrow functions for top-level exports
- **Tailwind CSS** for styling (avoid inline styles or CSS modules)
- **TypeScript** — use types, avoid `any`
- **Descriptive names** — prefer clarity over brevity

### File Structure
```
src/
├── components/       # Reusable UI components
├── routes/           # TanStack Router pages + API routes
├── screens/          # Feature-level UI (chat, settings, etc.)
├── server/           # Server-side gateway/filesystem modules
├── lib/              # Utilities and helpers
└── styles/           # Global CSS (minimal, mostly Tailwind)
```

### Component Example

```tsx
// ✅ Good
export function ChatMessage({ content, role }: ChatMessageProps) {
  return (
    <div className="flex gap-3 p-4">
      <span className="text-sm">{content}</span>
    </div>
  )
}

// ❌ Avoid
export const ChatMessage = ({ content, role }: ChatMessageProps) => (
  <div style={{ display: 'flex', gap: '12px' }}>
    <span>{content}</span>
  </div>
)
```

## Branch Naming

Use semantic prefixes:
- `feat/` — New features (e.g., `feat/push-notifications`)
- `fix/` — Bug fixes (e.g., `fix/search-crash`)
- `docs/` — Documentation only (e.g., `docs/deployment-guide`)
- `refactor/` — Code cleanup without behavior change
- `chore/` — Build, deps, tooling (e.g., `chore/update-deps`)

## Pull Request Guidelines

### Before Submitting
1. **Test locally** — Does it work in dev mode? In production build?
2. **Check types** — Run `npm run typecheck` (if available)
3. **Format code** — Follow existing style (we may add Prettier later)
4. **Update docs** — If you added a feature, document it in `docs/features.md`

### PR Template
Your PR should include:
- **Summary** — What does this change?
- **Motivation** — Why is this needed?
- **Testing** — How did you test it?
- **Screenshots** — (if UI change)

### Review Process
- Maintainers will review within 3-5 days
- Address feedback in new commits (don't force-push during review)
- Once approved, we'll squash-merge to main

## Adding New Dependencies

**Please ask first** before adding new npm packages:
1. Open an issue describing the need
2. Explain why existing solutions won't work
3. Wait for maintainer approval

We prefer to keep the bundle size small.

## Testing

We don't have automated tests yet (contributions welcome!). For now:
- Manual testing in Chrome, Safari, Firefox
- Test on mobile (responsive design)
- Test with slow network (Dev Tools → Network → Slow 3G)

## Upstream Workflow

OpenCami is a fork of [WebClaw](https://github.com/ibelick/webclaw). We aim to contribute useful features back upstream when possible.

### Contributing to WebClaw (Upstream)
If your feature is **generic** (not OpenClaw-specific), consider submitting it to WebClaw:

```bash
# Add upstream remote
git remote add upstream https://github.com/ibelick/webclaw.git
git fetch upstream

# Create branch from upstream/main
git checkout -b feat/your-feature upstream/main

# Make minimal changes (no OpenClaw-specific code)
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

## Documentation

### Where to Document
- **New features** → `docs/features.md` + README.md (one-liner only)
- **Architecture changes** → `docs/architecture.md`
- **Deployment notes** → `docs/deployment.md`
- **Breaking changes** → `CHANGELOG.md`

### Style
- **Concise and practical** — users want to get things done
- **Code examples** — show, don't just tell
- **Relative links** — keep navigation between docs easy

## Community

### Communication
- **GitHub Issues** — Bug reports, feature requests
- **GitHub Discussions** — Questions, ideas, show-and-tell
- **Pull Requests** — Code contributions

### Code of Conduct
Be respectful, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

## Recognition

Contributors will be:
- Listed in release notes
- Credited in README (for major features)
- Appreciated forever 💚

Thank you for helping make OpenCami better! 🦎
