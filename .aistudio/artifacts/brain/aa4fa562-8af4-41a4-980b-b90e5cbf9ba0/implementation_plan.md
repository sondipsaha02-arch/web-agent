# Google Authentication, Personal API Keys & Custom AI Personality

Secure, multi-tenant cloud architecture integrating Google/Gmail authentication via Firebase, isolated per-user Gemini API keys, cloud-synced custom personality instructions in settings, and silent attentive voice session initiation.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your responses to the clarifying questions, the following architecture has been established:

- **API Key Policy**: Allow limited guest exploration before requiring a personal Gemini API key, with an intuitive 1-click guide to obtain a free API key from Google AI Studio.
- **Session Startup Behavior**: Silent attentive standby upon connection (no robotic or repetitive startup announcements like "Listening Boss"). Tune will quietly listen and contextually engage as soon as you speak.
- **Data & Configuration Storage**: Secure cloud synchronization via Firebase Firestore under each authenticated user's private record (`users/{userId}`), ensuring multi-device persistence and complete data isolation.

---

## 1. Overview & Core Concept

Currently, the application runs on a shared server configuration. If the app is publicly deployed without per-user authentication, any user could consume the developer's server API quota.

This implementation transforms Tune into a multi-user, production-grade AI platform:
1. **Google / Gmail Authentication**: Users sign in with their own Google account using Firebase Auth.
2. **Personal API Key Management**: Each user securely stores and uses their own Google Gemini API key for their sessions, shielding developer credentials from misuse.
3. **Custom Personality & Behavioral Prompt**: A dedicated "Personality & Custom Instructions" prompt box in Settings allowing users to customize how Tune speaks and behaves (e.g., friendly companion, strict mentor, coding partner). If left blank, it defaults seamlessly to Tune's rich native personality.
4. **Context-Aware Silent Startup**: Tune connects silently, avoiding unsolicited greetings, and uses recent dialogue history to maintain contextual continuity.
5. **Multi-User Data Isolation**: User memories, chat history, and configuration are partitioned per `userId` in Firestore and protected with strict security rules.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌─────────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│  Welcome / Top  │  ──>  │  Google Sign-In Popup│  ──>  │ Cloud Profile Loaded   │
│  "Sign In" Icon │       │  (Firebase Auth)     │       │ (Avatar, Email, State) │
└─────────────────┘       └──────────────────────┘       └────────────────────────┘
                                                                     │
                                                                     ▼
┌────────────────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│ Voice Session Active   │  <──  │ Custom Personality & │  <──  │ Settings / Profile     │
│ (Silent Attentive Start│       │ Personal API Key Sync│       │ Modal Opened           │
└────────────────────────┘       └──────────────────────┘       └────────────────────────┘
```

1. **Header Account Status & Sign In**:
   - The top header displays a clean Google Avatar/Sign-in pill (`Sign in with Google` or user avatar with name tooltip).
   - Clicking opens the Google OAuth popup via Firebase Auth.
2. **Settings: Account & API Key Security**:
   - In Settings and the Tools Side Panel, a prominent **"Account & API Key Security"** card displays connection status.
   - Shows masked key preview (`AIzaSy...****`) with a "Test Connection" status badge.
   - Direct button: "Get Free Gemini API Key from Google AI Studio".
3. **Settings: Custom Personality & Instructions**:
   - A dedicated **"AI Personality & Instructions"** textarea with helpful preset chips (*"Supportive Friend"*, *"Strict Senior Engineer"*, *"Academic Tutor"*, *"Concise & Direct"*).
   - If empty, a subtle placeholder indicates: *"Using Tune's native intelligent companion persona (Default)"*.
   - Instant "Save & Sync to Account" button with cloud sync confirmation.
4. **Voice Interface & Session Initiation**:
   - When launching the live session, Tune enters silent listening mode immediately without unprompted chatter.
   - Visual waveform pulses gently to signal active standby.
   - When the user speaks, Tune immediately grounds its reply in the user's custom instructions and past chat history.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Authentication Provider (Firebase Google Auth)**
  - *Chosen Approach*: Native Firebase `GoogleAuthProvider` with `signInWithPopup`.
  - *Why*: Seamless 1-click login on mobile and desktop web; zero backend password handling; directly compatible with the provisioned Firestore database.
- **Decision 2: API Key Transmission & Runtime Isolation**
  - *Chosen Approach*: The client sends the user's active API key over an encrypted WebSocket handshake to the server session handler. The server instantiates an isolated `GoogleGenAI` instance strictly for that WebSocket connection.
  - *Why*: Gemini Live WebSockets run server-to-server. Using an isolated per-connection instance ensures that one user's key is never shared or reused across other users.
- **Decision 3: Fallback Strategy for Empty Custom Personality**
  - *Chosen Approach*: If the user leaves the custom instructions field empty, Tune's comprehensive native system instruction (`TUNE_SYSTEM_INSTRUCTION`) applies untouched. If the user enters custom instructions, they are prepended as high-priority user directives without stripping core safety or tool execution capabilities.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (BROWSER / PWA)                        │
│                                                                        │
│  ┌──────────────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│  │ Firebase Auth        │  │ User Settings Hub  │  │ LiveSession.ts │  │
│  │ (Google Sign-In)     │  │ - Custom Key Input │  │ (Audio/Mic/WS) │  │
│  └──────────┬───────────┘  │ - Personality Box  │  └───────┬────────┘  │
│             │              └──────────┬─────────┘          │           │
└─────────────┼─────────────────────────┼────────────────────┼───────────┘
              │                         │                    │
              ▼                         ▼                    ▼
┌─────────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐
│ Google Identity Service │ │ Firestore Database   │ │ Node.js Express   │
│ (OAuth 2.0 Auth Token)  │ │ /users/{userId}      │ │ WebSocket Server  │
└─────────────────────────┘ │ - encryptedApiKey    │ └─────────┬─────────┘
                            │ - personalityPrompt  │           │
                            │ - preferences        │           │
                            └──────────────────────┘           ▼
                                                     ┌───────────────────┐
                                                     │ Gemini 3.8 Live   │
                                                     │ Isolated Client   │
                                                     └───────────────────┘
```

### Firestore Data Model (`/users/{userId}`)

```json
{
  "userId": "string (Firebase Auth UID)",
  "email": "string",
  "displayName": "string",
  "photoURL": "string",
  "apiKey": "string (User's personal Gemini API key)",
  "personalityPrompt": "string (Custom behavioral instructions)",
  "speakingStyle": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Firestore Security Rules (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Server & Client Integration Points
1. **`src/lib/firebase.ts`**:
   - Initialize `getAuth(app)` and export `auth`, `googleProvider`, `signInWithGoogle`, and `signOutUser`.
   - Export user profile functions: `getUserProfile(uid)`, `saveUserProfile(uid, data)`.
2. **`server.ts`**:
   - Receive user-specific `customApiKey` and `personalityPrompt` during the WebSocket handshake.
   - If provided, prepend `personalityPrompt` directly to `getPersonalizedInstruction`.
   - Instantiate session with `new GoogleGenAI({ apiKey: sessionKey })`.
   - Suppress redundant startup vocalizations ("Listening Boss") to maintain silent attentive readiness.
3. **`src/components/AccountAuthModal.tsx` & `ControlPanel.tsx`**:
   - Modern Google Sign-In button with user profile display.
   - Dedicated "Personal Gemini API Key" input with verification state.
   - Dedicated "Personality & Custom Instructions" prompt box.
4. **`src/App.tsx`**:
   - Mount Auth state observer (`onAuthStateChanged`).
   - Sync cloud profile and personal settings on login.

---

## 5. Verification & Testing Plan

1. **Google Login Flow**:
   - Sign in using Google account -> Verify user avatar, email, and display name appear in the UI.
   - Sign out -> Verify state resets cleanly to guest mode.
2. **API Key Security & Isolation**:
   - Input custom Gemini API key -> Verify it is saved to the user's private Firestore record.
   - Verify server connects to Gemini Live using the user's private key.
   - Verify no private keys are bundled or exposed in static bundles or network logs.
3. **Custom Personality Prompt**:
   - Enter a distinct personality instruction (e.g. *"You are a funny poet; respond to everything in rhyming couplets"*).
   - Test voice interaction -> Verify Tune responds in the requested persona.
   - Clear the prompt -> Verify Tune reverts to standard native Banglish companion behavior.
4. **Silent Standby Initiation**:
   - Connect voice session -> Confirm Tune remains completely silent until the user speaks first.
   - Speak -> Confirm instant, context-aware reply.
5. **Compilation & Linting**:
   - Run `compile_applet` and `lint_applet` to confirm error-free production build.
