# Implementation Plan: User API Key Injection & Live LocalStorage Engine

## 1. Overview
User-injected API key architecture with persistent local browser key storage, live validation, and real-time response generation:
- **Direct API Key Injection**: The user can inject their own API key (Google Gemini `AIzaSy...`, OpenRouter `sk-or-...`, ChatGPT `sk-...`, Claude `sk-ant-...`, or Grok `xai-...`) directly in the app.
- **Browser LocalStorage Persistence**: Securely persisted in the browser's `localStorage` (`user_gemini_api_key`, `custom_gemini_api_key`, `tune_user_profiles_v2`, `tune_api_key_configured`). The key remains permanently saved on the user's device across reloads, page restarts, and sessions.
- **Live Real-Time Execution**: Instant live validation test calling `gemini-3.8-flash` on the server (`/api/validate-key`) which returns a live generated test response directly displayed to the user.
- **Dynamic Live AI Calls**: All subsequent AI operations (Live WebSocket audio stream `/ws`, `/api/chat`, screen analysis `/api/analyze-screen`, and PA planning) dynamically use the injected API key and re-connect live without requiring page reload.
- **Direct UI Triggers**:
  1. Quick 1-tap **Key** button right beside the top-left `☰` hamburger menu showing live pulsing status dot.
  2. Complete **API Key Injector** module inside `ToolsSidePanel` with "Live Test" button, live response output preview, provider selector pills, and "Clear" key action.
  3. Interactive **ApiKeySetupModal** with live test execution and clear key controls.

## 2. Completed Items
- [x] Implemented live validation and test response generation with `gemini-3.8-flash` in `server.ts`.
- [x] Migrated Gemini models across `server.ts` from deprecated identifiers to standard `gemini-3.8-flash`.
- [x] Added `liveTestResult` state and `handleTestActiveKeyLive` in `src/components/ToolsSidePanel.tsx`.
- [x] Enhanced API key UI slot in `src/components/ToolsSidePanel.tsx` with dedicated live test, clear key, and LocalStorage info badge.
- [x] Added quick API Key trigger button beside the top-left `☰` menu in `src/App.tsx` with live green pulsing indicator.
- [x] Added LocalStorage clear button and "Inject & Test Live" flow in `src/components/ApiKeySetupModal.tsx`.
- [x] Verified zero compile errors (`compile_applet`) and zero TypeScript lint errors (`lint_applet`).
