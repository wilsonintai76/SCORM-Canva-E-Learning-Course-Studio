# SCORM Canva — E-Learning Course Studio

A Canva-style visual authoring studio for **SCORM 1.2** e-learning courses: slide canvas, interactive
quizzes, branching, live SCORM player simulation, and one-click `.zip` packaging for any LMS.
Runs as a Windows desktop app (Electron) or in a browser.

## Requirements

- Node.js 20+

## Development

```bash
npm install
npm run dev        # browser preview on http://localhost:3000
npm test           # unit tests (node:test via tsx)
npm run lint       # type-check the app and the Electron sources
```

## Desktop app

```bash
npm run desktop    # build + launch the Electron shell (loads the real build from dist/)
npm run pack       # unpacked build in release/win-unpacked (fast smoke test)
npm run dist:win   # per-machine NSIS installer in release/
```

The installer is unsigned; Windows SmartScreen will warn on first run until a code-signing
certificate is configured.

## AI providers (bring your own key)

The AI palette works with **your own** key or a **local model** - no requests pass through any
server of ours. Open the palette, click the gear icon, then pick a provider:

| Provider | Needs a key | Notes |
| --- | --- | --- |
| Google Gemini | Yes | Free tier; reliable JSON output |
| DeepSeek | Yes | Low cost, OpenAI-compatible |
| OpenAI | Yes | Any GPT model |
| Ollama (local) | No | Fully offline; installed models are detected automatically |
| Custom endpoint | Optional | Any OpenAI-compatible server (LM Studio, vLLM, Azure, OpenRouter) |

- Keys are encrypted at rest with the OS credential vault (`safeStorage`) in
  `%APPDATA%\SCORM Canva Studio\ai-keys.json`. A plain browser falls back to local storage.
- Provider requests are proxied through the desktop main process, which allows only the listed
  hosts plus `localhost`, so local models work despite browser CORS rules.
- Local models get a 5-minute timeout (remote: 2 minutes) because 7B models are slow.
- If no provider is configured, or a call fails, the studio falls back to a built-in offline
  course template so authoring is never blocked.
- Quality note: coding-tuned models (e.g. `qwen2.5-coder`) sometimes ignore the requested topic.
  Use a general instruct model such as `llama3.1:8b` for course writing.

## Where data lives

| Data | Location |
| --- | --- |
| Course, theme, editor session | app `localStorage` (autosaved) |
| Course images | `%APPDATA%\SCORM Canva Studio\media\` (content-addressed files) |
| API keys | `%APPDATA%\SCORM Canva Studio\ai-keys.json` (encrypted) |
| Exports | wherever you choose in the native Save dialog |

Media is stored as short `media://<hash>.<ext>` references in the course JSON, so project files stay
small and the SCORM package ships real `media/` files instead of base64 blobs.

## Project layout

```
electron/          main + preload (window, native menu, IPC, AI proxy, secret store)
src/
  components/      UI (canvas, inspector, sidebar, modals, palette)
  data/            templates, slide layouts, blank-course factory
  media/           media store: refs, hydration, SCORM externalisation
  packager/        imsmanifest.xml + standalone player + zip
  scorm/           SCORM 1.2 runtime, suspend data, mock LMS
  services/        AI providers, SCORM bundling
  store/           course store (undo, versions, persistence)
  utils/           pure helpers
```
