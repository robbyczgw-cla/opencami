# OpenCami Feature Wishlist 🦎

> A prioritized list of features to make chatting with Cami even more awesome.
> Generated: 2026-02-05

## Current State

OpenCami already has:
- ✅ Multi-session chat with sidebar
- ✅ Theme support (system/light/dark)
- ✅ Settings dialog
- ✅ Show/hide tool messages & reasoning blocks
- ✅ Follow-up suggestions (rule-based, client-side)
- ✅ Message timestamps
- ✅ Markdown rendering with code highlighting
- ✅ Mobile-responsive design

---

## 🔥 Must-Have (High Value, Reasonable Effort)

### 1. Keyboard Shortcuts
**Description:** Power users want to fly through conversations without touching the mouse.

**Shortcuts to implement:**
- `⌘/Ctrl + K` → New chat
- `⌘/Ctrl + /` → Focus input
- `⌘/Ctrl + ↑/↓` → Navigate between conversations
- `Escape` → Close modals, clear input focus
- `⌘/Ctrl + Shift + C` → Copy last response
- `⌘/Ctrl + E` → Edit last message (if supported)

**Why it's cool:** Makes OpenCami feel professional and fast. Power users will love it.

**Effort:** ~4-6 hours
**Priority:** MUST-HAVE

---

### 2. Context Window Meter
**Description:** Visual indicator showing how much of the context window is used in the current conversation.

**Implementation:**
- Circular progress indicator or horizontal bar
- Shows percentage used (e.g., "32K / 128K tokens - 25%")
- Color changes as it fills (green → yellow → red)
- Hover for breakdown: input tokens, output tokens, cached tokens

**Why it's cool:** Users can see when conversations are getting "heavy" and might need to start fresh. Prevents surprise truncation.

**Effort:** ~6-8 hours (need to get token counts from gateway)
**Priority:** MUST-HAVE

---

### 3. Conversation Export
**Description:** Export chat conversations in various formats.

**Formats:**
- Markdown (.md) - most useful
- JSON (full structured data)
- Plain text
- PDF (stretch goal)

**Why it's cool:** Users want to save important conversations, share them, or archive for reference.

**Effort:** ~4-5 hours
**Priority:** MUST-HAVE

---

### 4. Smart Follow-ups (LLM-Powered) ✨
**Description:** Upgrade the existing rule-based follow-ups to use the LLM for context-aware suggestions.

**How it works:**
- After assistant response, make a lightweight call to generate 3 suggestions
- Use a smaller/faster model or very short prompt
- Cache aggressively to avoid latency
- Fall back to rule-based if slow/failed

**Why it's cool:** Suggestions that actually understand the conversation context, not just pattern matching.

**Effort:** ~8-10 hours (already started!)
**Priority:** MUST-HAVE (in progress)

---

### 5. Message Actions Enhancement
**Description:** Expand the actions available on each message.

**Actions to add:**
- Copy message (already have?)
- Copy as markdown
- Regenerate response
- Edit & resubmit (for user messages)
- Share/link to message
- Add to favorites/bookmarks

**Why it's cool:** More control over the conversation without clunky workflows.

**Effort:** ~6-8 hours
**Priority:** MUST-HAVE

---

## 💫 Nice-to-Have (Good Value, Moderate Effort)

### 6. Conversation Starters / Empty State
**Description:** When starting a new chat, show suggested prompts to get started.

**Ideas:**
- "What would you like to create today?"
- Quick action cards: "Write code", "Explain concept", "Brainstorm ideas", "Help me debug"
- Recent topics or frequently used prompts
- Time-of-day greetings: "Good morning! Ready to build something?"

**Why it's cool:** Reduces blank page anxiety, helps users discover capabilities.

**Effort:** ~4-5 hours
**Priority:** NICE-TO-HAVE

---

### 7. Model Selector
**Description:** Allow users to switch between available models.

**Implementation:**
- Dropdown in the composer area or settings
- Show available models from gateway
- Remember preference per session or globally
- Show model capabilities (context size, speed indicator)

**Why it's cool:** Different tasks need different models. Quick switching is powerful.

**Effort:** ~6-8 hours
**Priority:** NICE-TO-HAVE

---

### 8. Cost Display
**Description:** Show estimated cost for the conversation.

**Implementation:**
- Subtle cost indicator near context meter
- Per-message cost on hover
- Session total cost
- Use tokenlens library or gateway-provided pricing

**Why it's cool:** Transparency about API costs helps users make informed decisions.

**Effort:** ~4-6 hours (depends on gateway data availability)
**Priority:** NICE-TO-HAVE

---

### 9. Search Within Conversations
**Description:** Find messages across all conversations or within current chat.

**Implementation:**
- `⌘/Ctrl + F` for current conversation search
- Global search in sidebar with results preview
- Highlight matches
- Jump to message

**Why it's cool:** Finding that one conversation where you solved a similar problem.

**Effort:** ~8-10 hours
**Priority:** NICE-TO-HAVE

---

### 10. Conversation Folders/Tags
**Description:** Organize conversations beyond just a flat list.

**Implementation:**
- Create folders: "Work", "Personal", "Projects"
- Or simpler: color tags/labels
- Filter sidebar by folder/tag
- Drag-and-drop to organize

**Why it's cool:** Heavy users accumulate many conversations. Organization = sanity.

**Effort:** ~10-12 hours
**Priority:** NICE-TO-HAVE

---

### 11. Quick Personas
**Description:** Pre-configured system prompts for different modes.

**Built-in personas:**
- 🦎 Cami (default)
- 👨‍💻 Code Assistant
- ✍️ Writing Helper
- 🧠 Brainstorm Partner
- 📚 Researcher
- Custom personas (user-defined)

**Why it's cool:** One-click to change the AI's behavior for different tasks.

**Effort:** ~6-8 hours
**Priority:** NICE-TO-HAVE

---

### 12. Thinking Level Toggle
**Description:** Quick toggle for reasoning/thinking depth.

**Options:**
- Off / Low / Medium / High
- Show in composer area as small selector
- Remember per conversation

**Why it's cool:** Sometimes you want deep thinking, sometimes you want fast responses.

**Effort:** ~3-4 hours
**Priority:** NICE-TO-HAVE

---

### 13. Message Timestamps Enhancement
**Description:** Smarter timestamp display.

**Implementation:**
- Relative time: "Just now", "2 min ago", "Yesterday at 3:42 PM"
- Group messages by day with date separators
- Full timestamp on hover
- User timezone preference

**Why it's cool:** More natural time display improves readability.

**Effort:** ~3-4 hours
**Priority:** NICE-TO-HAVE

---

### 14. Code Block Enhancements
**Description:** Make code blocks more powerful.

**Features:**
- Language detection & display
- Line numbers (toggleable)
- Copy button (already have?)
- "Run in terminal" (if possible via gateway)
- Diff view for before/after code
- Collapsible for long blocks

**Why it's cool:** Code is a huge part of AI interactions. Make it shine.

**Effort:** ~8-10 hours
**Priority:** NICE-TO-HAVE

---

### 15. Voice Input (Dictation)
**Description:** Speak instead of type.

**Implementation:**
- Microphone button in composer
- Use Web Speech API (browser native)
- Real-time transcription as you speak
- Auto-submit option or manual

**Why it's cool:** Hands-free input, accessibility, faster for some users.

**Effort:** ~6-8 hours
**Priority:** NICE-TO-HAVE

---

## 🔮 Future (Ambitious, Higher Effort)

### 16. Conversation Branching
**Description:** Fork a conversation at any point to explore different directions.

**Implementation:**
- "Branch from here" action on any message
- Visual tree view of branches
- Compare branches side-by-side
- Merge insights back

**Why it's cool:** Explore multiple approaches without losing context. Mind-blowing for complex problems.

**Effort:** ~20-30 hours
**Priority:** FUTURE

---

### 17. Multi-Tab/Split View
**Description:** View multiple conversations side-by-side.

**Implementation:**
- Tab bar for quick switching
- Split screen option (2 chats)
- Drag message from one chat to another

**Why it's cool:** Cross-reference conversations, compare responses.

**Effort:** ~15-20 hours
**Priority:** FUTURE

---

### 18. Custom Themes
**Description:** User-defined color schemes beyond light/dark.

**Implementation:**
- Theme editor with color pickers
- Import/export themes
- Community theme gallery
- Preset themes: Dracula, Monokai, Solarized, etc.

**Why it's cool:** Personalization makes it feel like *your* app.

**Effort:** ~12-15 hours
**Priority:** FUTURE

---

### 19. Attachments & File Upload
**Description:** Attach files to messages.

**Types:**
- Images (already may be supported?)
- Documents (PDF, txt, md)
- Code files
- Data files (CSV, JSON)

**Why it's cool:** "Analyze this spreadsheet" or "What's in this image?" - essential for many workflows.

**Effort:** ~15-20 hours
**Priority:** FUTURE

---

### 20. Collaborative Chats
**Description:** Share a conversation with others in real-time.

**Implementation:**
- Generate shareable link
- Multiple users in same session
- Presence indicators
- Permission levels (view/edit)

**Why it's cool:** Pair programming with AI, team brainstorming sessions.

**Effort:** ~30-40 hours
**Priority:** FUTURE

---

### 21. Plugin System
**Description:** Extensible architecture for custom widgets.

**Examples:**
- Weather widget
- Calculator
- Code playground
- Chart generator
- Custom tool integrations

**Why it's cool:** Infinite extensibility, community contributions.

**Effort:** ~40+ hours
**Priority:** FUTURE

---

### 22. Offline Mode / PWA
**Description:** Work offline with cached conversations.

**Implementation:**
- Service worker for caching
- IndexedDB for local storage
- Sync when back online
- PWA install support

**Why it's cool:** Access conversations anywhere, even on planes.

**Effort:** ~15-20 hours
**Priority:** FUTURE

---

### 23. Analytics Dashboard
**Description:** Personal usage insights.

**Metrics:**
- Messages sent per day/week
- Token usage over time
- Most used prompts
- Cost tracking
- Time spent

**Why it's cool:** Understand your AI usage patterns.

**Effort:** ~15-20 hours
**Priority:** FUTURE

---

## 📋 Quick Win Ideas (< 2 hours each)

These are small improvements that add polish:

1. **Typing indicator animation** - Make it feel more alive ✅ (already done?)
2. **Smooth scroll animations** - Ease-in-out instead of instant
3. **Character counter in composer** - Show length as you type
4. **Clear conversation button** - With confirmation dialog
5. **Pin conversations** - Keep important ones at top
6. **Conversation rename** - Double-click to edit title
7. **Last active indicator** - Show "3 days ago" in sidebar
8. **Keyboard shortcut cheatsheet** - ? or ⌘+? to show
9. **Focus trap in dialogs** - Accessibility improvement
10. **Reduced motion option** - Accessibility preference
11. **Compact mode** - Denser message display option
12. **Syntax theme selector** - For code blocks
13. **Auto-save drafts** - Never lose a half-typed message
14. **"Cami is thinking" toast** - For long responses
15. **Double-click to copy** - Quick copy on message double-click

---

## Implementation Priority Matrix

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Keyboard Shortcuts | 4-6h | High |
| 2 | Smart Follow-ups (LLM) | 8-10h | High |
| 3 | Context Window Meter | 6-8h | High |
| 4 | Conversation Export | 4-5h | Medium |
| 5 | Message Actions | 6-8h | Medium |
| 6 | Model Selector | 6-8h | High |
| 7 | Conversation Starters | 4-5h | Medium |
| 8 | Thinking Level Toggle | 3-4h | Medium |
| 9 | Cost Display | 4-6h | Medium |
| 10 | Search | 8-10h | High |

---

## Notes

- All features should work with OpenClaw Gateway (no local AI)
- Mobile-first thinking - test on small screens
- Accessibility matters - ARIA labels, keyboard nav, screen readers
- Performance budget - keep initial load under 200KB JS
- Theme consistency - use existing Tailwind/shadcn patterns

---

*Built with 💚 for the OpenCami community*
