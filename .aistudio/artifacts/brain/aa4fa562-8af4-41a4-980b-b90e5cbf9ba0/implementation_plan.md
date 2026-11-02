# Implementation Plan: Card View Gestures, Screen Dragging & Side Panel Card Mode Toggle

## 1. Overview
Implemented complete gestures, screen boundary behavior, and dedicated Card Mode control:
- **Card Draggability & Boundary Minimization**: The user can freely drag the YouTube player card anywhere across the screen. If dragged/flung toward or outside viewport boundaries, the card automatically snaps into a minimized vinyl ball shortcut (docking at top-left beside the `☰` menu or bottom-left corner). When within screen, it automatically stays visible without getting lost offscreen.
- **Double-Click Rewind & Skip (Both With Controls & Without)**: Left side double-click rewinds 10s (`-10 seconds`), right side double-click skips 10s (`+10 seconds`), accompanied by YouTube-style ripple arrow feedback and action sound. Single click cleanly toggles the controls overlay or dismisses it after 3 seconds.
- **Dedicated Card Mode in Side Panel**: Dedicated toggle in the Quick Controls section of the Side Panel (accessed via the `☰` menu) to turn Card Mode ON or OFF. When ON, any music/video play command and Google research immediately open in in-app floating cards. When OFF, standard browser tab opening takes place.

## 2. Completed Items
- [x] Unrestricted motion dragging across the whole screen in `src/components/YouTubePlayerDock.tsx`.
- [x] Edge / boundary detection to auto-minimize into spinning vinyl audio ball on drag-off.
- [x] Dual-position smart docking (beside top-left `☰` menu or bottom-left corner) for the minimized ball.
- [x] Double-click / double-tap 10s skip (right) and rewind (left) in `YouTubePlayerDock.tsx` both when controls are showing and when hidden.
- [x] Red swipable progress slider bar and volume slider.
- [x] Dedicated "Card Mode" tile with iOS switch in `ToolsSidePanel.tsx`.
- [x] Event synchronization with `tune_card_mode_changed` in `YouTubePlayerDock.tsx`, `SearchCardDock.tsx`, and `ToolManager.ts`.
- [x] Verified zero compile errors (`compile_applet`) and zero TypeScript lint errors (`lint_applet`).
