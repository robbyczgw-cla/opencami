# Credits & Attribution

OpenCami is a fork of [WebClaw](https://github.com/ibelick/webclaw), created by [@ibelick](https://github.com/ibelick).

We deeply appreciate the original work that made this project possible.

---

## Original WebClaw (MIT License)

**Repository:** https://github.com/ibelick/webclaw  
**Author:** [@ibelick](https://github.com/ibelick) (Julien Thibeaut)  
**License:** MIT

### What Comes From WebClaw

The following components, architecture, and functionality are inherited from the original WebClaw project:

#### Core Architecture
- **TanStack Start** framework setup and SSR configuration
- **TanStack Router** file-based routing system
- **Vite** build configuration and dev server setup
- **React 19** integration with server components

#### UI Components (`src/components/`)
- `ui/` — Complete UI component library (Button, Menu, Dialog, etc.)
- `prompt-kit/` — Prompt input components with textarea handling
- `chat-message.tsx` — Message rendering with markdown support
- `theme-toggle.tsx` — Dark/light mode switching
- `scroll-button.tsx` — Scroll-to-bottom functionality

#### Chat Screen (`src/screens/chat/`)
- `chat-screen.tsx` — Main chat orchestration and state management
- `hooks/use-chat.ts` — Chat history and message handling
- `hooks/use-stream.ts` — WebSocket streaming implementation
- `components/chat-history.tsx` — Message list rendering
- `components/chat-header.tsx` — Session header with controls
- `components/chat-empty-state.tsx` — Welcome screen

#### Server & Gateway (`src/server/`)
- `gateway.ts` — OpenClaw Gateway WebSocket RPC client
- `auth.ts` — Gateway authentication handling

#### Styling
- `styles.css` — Base Tailwind configuration
- CSS custom properties for theming
- Responsive design breakpoints

#### Routes
- `__root.tsx` — Root layout with providers
- `index.tsx` — Home/redirect logic
- `connect.tsx` — Gateway connection setup
- `$sessionKey.tsx` — Dynamic session routing
- `new.tsx` — New session creation

#### Utilities (`src/lib/`)
- `utils.ts` — Helper functions (cn, etc.)
- `constants.ts` — App constants

#### Assets
- `logo.svg` — OpenClaw logo
- `favicon.svg` — Browser icon
- `cover.webp` — Social media preview image

---

## OpenCami Additions

The following features were added in the OpenCami fork:

### New Components
- `model-selector.tsx` — Dynamic model switching dropdown
- `command-help.tsx` — Slash command reference panel
- `keyboard-shortcuts.tsx` — Keyboard shortcut handler
- `export-dialog.tsx` — Conversation export (MD/JSON/TXT)

### New API Routes (`src/routes/api/`)
- `models.ts` — Fetch available models from Gateway config
- `follow-ups.ts` — Smart follow-up suggestions

### New Hooks
- `use-follow-up-suggestions.ts` — Follow-up generation logic
- `use-keyboard-shortcuts.ts` — Global keyboard handler

### Modified Files
- `chat-composer.tsx` — Added model selector and command help integration
- `chat-screen.tsx` — Added model parameter to message sending
- `package.json` — Changed default port to 3001

### Documentation
- `README.md` — Comprehensive feature documentation
- `CREDITS.md` — This attribution file
- `docs/FEATURE_WISHLIST.md` — Future feature roadmap

---

## Third-Party Dependencies

OpenCami uses many excellent open-source packages. Key dependencies include:

| Package | Purpose | License |
|---------|---------|---------|
| [React](https://react.dev/) | UI framework | MIT |
| [TanStack Router](https://tanstack.com/router) | File-based routing | MIT |
| [TanStack Start](https://tanstack.com/start) | Full-stack framework | MIT |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS | MIT |
| [Vite](https://vitejs.dev/) | Build tool | MIT |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management | MIT |
| [Radix UI](https://www.radix-ui.com/) | Accessible primitives | MIT |
| [Hugeicons](https://hugeicons.com/) | Icon library | MIT |
| [react-markdown](https://github.com/remarkjs/react-markdown) | Markdown rendering | MIT |

See `package.json` for the complete dependency list.

---

## License

Both WebClaw and OpenCami are released under the **MIT License**.

```
MIT License

Copyright (c) 2025 Julien Thibeaut (WebClaw)
Copyright (c) 2026 robbyczgw-cla (OpenCami additions)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Thank You

Special thanks to:

- **[@ibelick](https://github.com/ibelick)** — For creating WebClaw and releasing it as open source. The clean architecture and modern stack made it a joy to build upon.
- **[OpenClaw](https://github.com/openclaw/openclaw)** — For building an incredible AI assistant platform.
- **The open source community** — For all the amazing tools and libraries that make projects like this possible.

---

*If you use OpenCami or WebClaw in your project, please consider giving credit by linking back to the original repositories.*
