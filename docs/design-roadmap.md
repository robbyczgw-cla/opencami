# OpenCami Design Roadmap

Based on Opus Design Review (2026-02-10). Overall Score: **5.5/10** → Target: **7.5+/10**

## Priority 1: Critical (Empty/Broken)

### 🎭 Personas Tab Redesign (Score: 3/10)
- [ ] Show persona list with avatars/icons, names, descriptions
- [ ] One-click persona selection
- [ ] Persona categories (Professional, Creative, Fun, etc.)
- [ ] Currently selected persona highlighted
- [ ] "Create Custom Persona" (future)

### ℹ️ About Tab Redesign (Score: 2.5/10)
- [ ] Version number prominently displayed
- [ ] "What's New" / Changelog section
- [ ] Keyboard shortcuts reference (⌘K, ⌘F, ⌘⇧F, etc.)
- [ ] System info (gateway, session count)
- [ ] Credits/acknowledgments
- [ ] Feedback/bug report link
- [ ] App logo/illustration

## Priority 2: High Impact Polish

### 🎨 Appearance Improvements (Score: 7/10)
- [ ] Live preview thumbnails for themes (like macOS Appearance)
- [ ] Mini-previews for Density/Width options
- [ ] Font Family grid: more breathing room
- [ ] Consistent control styling (pills vs bordered buttons)

### 💬 Chat Tab Polish (Score: 5.5/10)
- [ ] Group toggles: "Display" (tool msgs, reasoning, sources) + "Advanced" (Agent Manager, Cron, File Preview)
- [ ] Section headers with subtle dividers
- [ ] Styled (Beta) badges instead of plain text
- [ ] Icons next to each option
- [ ] Larger toggle touch targets (44px)

### 🔊 Voice Tab Polish (Score: 5/10)
- [ ] "Preview Voice" button with sample text
- [ ] Show available providers with icons (ElevenLabs, OpenAI, Edge)
- [ ] Voice selection dropdown per provider
- [ ] Fill empty space with helpful context

## Priority 3: Main Chat UI (Score: 6.5/10)

- [ ] Smart session name truncation (not ID gibberish)
- [ ] Better "Thinking" indicator (animated dots/pulse)
- [ ] Subtler close button (X) on modals
- [ ] Token/char count near input field
- [ ] Better "Select" link contrast in sidebar

## Priority 4: LLM Features (Score: 6.5/10)

- [ ] Provider dropdown with icons
- [ ] Model dropdown (not free text)
- [ ] Feature descriptions / tooltips
- [ ] Better API key status (valid/invalid/untested)

## Design Principles (Anthropic Frontend Design Skill)

- **Typography**: Distinctive, not generic
- **Color**: Cohesive, dominant colors with sharp accents
- **Motion**: Micro-interactions, satisfying hover/active states
- **Space**: Intentional — no wasted emptiness, no cramping
- **Details**: Atmosphere and depth, premium feel

## Benchmarks

| App | Strength | We Beat Them On |
|-----|----------|-----------------|
| ChatGPT | Polish, animations, "finished" feel | Customization depth |
| Claude.ai | Typography, premium feel, whitespace | Session organization, personas |
| Cursor | Dense, info-rich settings | Theme variety (6 vs 2) |
