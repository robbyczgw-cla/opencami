# OpenCami Code Review — 2026-02-09

## 1. Critical (must fix before npm publish)

### C1: STT/TTS duplicate provider attempts on failure
**Files:** `src/routes/api/stt.ts:120-160`, `src/routes/api/tts.ts`
When a specific provider is requested (e.g., `provider=elevenlabs`) and it fails, `errors.length > 0` triggers the auto-mode block, which retries the same provider again. Wastes API calls and doubles latency on failure.

**Fix:** Skip already-attempted providers in the auto block, or return immediately after the specific-provider block fails instead of falling through.

### C2: EdgeTTS API mismatch (pre-existing)
**File:** `src/routes/api/tts.ts:110,116`
`tts.synthesize()` and `tts.toBuffer()` don't exist on the `EdgeTTS` type from `node-edge-tts`. This means Edge TTS (the free fallback) is completely broken at runtime.

### C3: STT silent error swallowing — no user feedback
**File:** `src/screens/chat/components/chat-composer.tsx:250-260`
When the `/api/stt` fetch fails or returns `ok: false`, the catch block does nothing. User records audio, waits, and... nothing happens. Should show a toast/alert.

## 2. Important (should fix soon)

### I1: Web Speech API `recognition.onerror` discards error info
**File:** `chat-composer.tsx:224`
The error handler ignores the error event entirely. Should at least distinguish `not-allowed` (permissions) vs `no-speech` (silence) vs `network` for user feedback.

### I2: MediaRecorder MIME type — Safari compatibility
**File:** `chat-composer.tsx:234`
Checks `audio/webm` then falls back to `audio/mp4`. Safari may not support either — should also try `audio/m4a` or handle the case where no supported type exists.

### I3: No max file size check on STT audio upload
**File:** `src/routes/api/stt.ts`
No size limit on the uploaded audio blob. ElevenLabs/OpenAI have limits (25MB for Whisper). Should reject oversized uploads early with a clear error.

### I4: Settings dialog unused props
**File:** `settings-dialog.tsx:82-84`
`pathsLoading`, `pathsError`, `paths`, `onCopySessionsDir`, `onCopyStorePath` are in the type but destructured away (only `open`, `onOpenChange`, `onClose` used). Dead interface.

### I5: TTS voice preference not sent to API
The `opencami-tts-voice` localStorage value is set in settings but the TTS playback code (in MessageActionsBar or wherever the 🔊 button calls `/api/tts`) would need to read and send it. Not verified if it does — likely missing.

### I6: `stopRecording` doesn't clean up MediaRecorder stream tracks
**File:** `chat-composer.tsx:202-212`
`stopRecording` stops the MediaRecorder but doesn't stop the media stream tracks. The `onstop` handler does `stream.getTracks().forEach(t => t.stop())`, but if `stopRecording` is called externally (e.g., unmount cleanup), the stream tracks may leak because `stream` is only in the `onstop` closure.

### I7: Recording timer race condition
**File:** `chat-composer.tsx:216,240`
The 120-second auto-stop calls `stopRecording()` inside `setRecordingTime` updater. This mutates refs during a state update, which could cause issues. Better to use a `useEffect` watching `recordingTime`.

## 3. Minor (nice to have)

### M1: `GatewayConfigResponse` type duplicated
Defined identically in both `stt.ts` and `tts.ts`. Should be a shared type.

### M2: Slash commands hardcoded
`FALLBACK_SLASH_COMMANDS` is a large static array that could be fetched from the gateway or at least moved to a shared constant file.

### M3: No aria-live region for STT loading state
Screen readers won't announce when transcription is in progress or complete.

### M4: `select` elements in settings use no dark-theme-aware styling
The `<select>` dropdowns use `bg-surface` but native `<option>` elements don't respect CSS custom properties in most browsers. Will look wrong in dark mode.

### M5: Changelog missing link for 1.1.0 and 1.0.0
Only `[1.2.0]` has a link reference at the bottom.

### M6: README lists "Agent Manager" but docs/architecture.md doesn't document its API route or store.

### M7: docs/features.md and README feature lists are near-duplicates — could consolidate.

## 4. Pre-existing TypeScript Errors (23 total)

| # | File | Line | Error | Category |
|---|------|------|-------|----------|
| 1 | `components/prompt-kit/markdown.tsx` | 345 | `asChild` doesn't exist on ButtonProps | UI lib mismatch |
| 2 | `components/prompt-kit/markdown.tsx` | 349 | Comparing `"error"\|"success"\|"loading"` with `"idle"` | Logic error |
| 3 | `routes/api/tts.ts` | 110 | `synthesize` doesn't exist on EdgeTTS | **API mismatch (C2)** |
| 4 | `routes/api/tts.ts` | 116 | `toBuffer` doesn't exist on EdgeTTS | **API mismatch (C2)** |
| 5 | `screens/chat/components/chat-sidebar.tsx` | 273 | `asChild` prop invalid | UI lib mismatch |
| 6 | `screens/chat/components/chat-sidebar.tsx` | 313 | `asChild` prop invalid | UI lib mismatch |
| 7 | `screens/files/components/file-list.tsx` | 384 | Unused `focusedIndex` | Unused var |
| 8 | `screens/files/components/file-list.tsx` | 474 | Unused `index` | Unused var |
| 9 | `screens/files/components/file-list.tsx` | 513 | Unused `index` | Unused var |
| 10-19 | `screens/files/components/files-sidebar.tsx` | 85,93,102,155,160,184,212,262,308,313,337 | `ease: string` not assignable to `Easing` (×8), `asChild` invalid (×2) | Framer Motion types / UI lib |
| 20 | `screens/files/file-explorer-screen.tsx` | 94 | `unknown` not assignable to `FileListing` | Missing type assertion |
| 21-22 | `screens/files/hooks/use-files.ts` | 84 | `onError` removed in TanStack Query v5; implicit `any` | API migration |

### Categories:
- **UI lib `asChild` mismatch** (5 errors): The component library doesn't support Radix-style `asChild`. Need wrapper or different composition pattern.
- **Framer Motion `ease` type** (8 errors): Use `as const` assertion: `{ duration: 0.2, ease: "easeOut" as const }`.
- **EdgeTTS API** (2 errors): Check `node-edge-tts` docs for correct API. May need different package or wrapper.
- **TanStack Query v5** (2 errors): `onError` was removed. Use `meta` or handle error in component via `query.error`.
- **Unused vars** (3 errors): Prefix with `_` or remove.
- **Type assertion** (1 error): Add `as FileListing` or type the query properly.
- **Logic error** (1 error): The idle comparison suggests missing state — add `"idle"` to the union or fix the condition.

## 5. Docs Accuracy

- **CHANGELOG.md**: Accurate, well-structured. Missing link refs for v1.1.0 and v1.0.0.
- **README.md**: Accurate. Feature list matches implementation.
- **docs/features.md**: Accurate and thorough. Matches codebase.
- **docs/architecture.md**: Accurate. localStorage keys section is a nice touch. Missing Agent Manager docs.
