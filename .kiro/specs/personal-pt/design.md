# Design Document

## Overview

Personal PT is a Vite + React + TypeScript SPA delivered as a PWA. All user data is stored locally in IndexedDB via the `idb` library — no account or internet connection is required. A minimal Express backend stub is included for optional future cloud sync but plays no role in the primary data flow.

---

## Project Structure

```
PersonalPT/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── WorkoutCard.tsx
│   │   ├── BottomNav.tsx
│   │   ├── StatsBar.tsx
│   │   ├── PhaseDisplay.tsx
│   │   ├── TimerDisplay.tsx
│   │   ├── ProgressBar.tsx
│   │   └── PlaybackControls.tsx
│   ├── pages/               # Route-level page components
│   │   ├── HomePage.tsx
│   │   ├── EditWorkoutPage.tsx
│   │   ├── RunPage.tsx
│   │   ├── HistoryPage.tsx
│   │   └── SettingsPage.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useDB.ts
│   │   ├── useWorkoutRunner.ts
│   │   └── useAudio.ts
│   ├── lib/                 # Pure utilities
│   │   ├── db.ts            # IndexedDB initialisation & typed accessors
│   │   ├── audio.ts         # Web Audio API sound player factory
│   │   └── presets.ts       # Static preset workout definitions
│   ├── shared/
│   │   └── schema.ts        # Zod schemas, inferred TS types, Drizzle tables
│   ├── App.tsx              # Wouter router + ThemeProvider
│   └── main.tsx             # Entry point — DB init then React mount
├── public/
│   └── manifest.webmanifest
├── server/
│   └── index.ts             # Express stub (no active routes)
├── vite.config.ts           # vite-plugin-pwa configuration
└── tailwind.config.ts       # darkMode: ["class"], CSS var colour tokens
```

---

## Data Layer

### IndexedDB (`src/lib/db.ts`)

Opens `workout-app-db` at version 1 using the `idb` library. The `upgrade` callback creates two object stores:

| Store | keyPath | Indexes |
|-------|---------|---------|
| `workouts` | `id` | `by-date` on `createdAt` |
| `runs` | `id` | `by-date` on `startedAt`, `by-workout` on `workoutId` |

On first open (previous version `< 1`), the upgrade callback seeds the three preset workouts from `src/lib/presets.ts`. Subsequent opens at version 1 skip seeding entirely.

All reads and writes go through a typed wrapper layer that validates data against the Zod schemas before any write operation. A failed validation throws with the Zod error message rather than writing invalid data.

### Shared Schemas (`src/shared/schema.ts`)

Defines and exports:

- `exerciseSchema` → `Exercise` type
- `workoutSchema` → `Workout` type
- `workoutRunSchema` → `WorkoutRun` type

When `DATABASE_URL` is present, Drizzle ORM table definitions are derived from the same schemas via `drizzle-zod` for future PostgreSQL sync.

All `id` fields are UUIDs generated with the `uuid` library at creation time.

### Preset Workouts (`src/lib/presets.ts`)

Static array of three `Workout` objects with `isPreset: true`:

| id | Name | Rounds | Accent | Exercises |
|----|------|--------|--------|-----------|
| `preset-classic` | 7 Minute Workout | 1 | `#FF7F11` | 11 × (30s work / 10s rest) |
| `preset-core` | Core Crusher | 2 | `#3B82F6` | 8 × (40s work / 10s rest) |
| `preset-stretch` | Quick Stretch | 1 | `#10B981` | 4 exercises (mixed durations) |

---

## Component Architecture

```
App (ThemeProvider + Wouter Router)
├── BottomNav            ← hidden when useRoute('/run/:id') matches
└── Switch
    ├── /           → HomePage
    │     ├── StatsBar          (streak + total count from runs store)
    │     ├── Section: Presets
    │     │     └── WorkoutCard ×n
    │     └── Section: Custom
    │           ├── WorkoutCard ×n
    │           └── CreateButton → /create
    ├── /create     → EditWorkoutPage (create mode)
    ├── /edit/:id   → EditWorkoutPage (edit mode, loads existing workout)
    ├── /run/:id    → RunPage
    │     ├── PhaseDisplay      (background colour driven by phase)
    │     ├── TimerDisplay      (JetBrains Mono, 80px mobile / 150px desktop)
    │     ├── ProgressBar
    │     └── PlaybackControls  (Restart | Pause/Play | Skip)
    ├── /history    → HistoryPage
    │     └── RunRow ×n         (name, date, duration, completion badge)
    ├── /settings   → SettingsPage
    │     ├── ThemeSelector     (Light / Dark / System via next-themes)
    │     └── ClearHistoryButton (destructive style, confirm dialog)
    └── * → Redirect to /
```

### WorkoutCard

Displays workout name, total duration (minutes, rounded), and exercise count. Contains a three-dot menu with "Edit Workout" (→ `/edit/:id`). Delete option is omitted when `isPreset` is `true`. Start button (`bg-[#FF5D12] rounded-xl`) navigates to `/run/:id`.

### EditWorkoutPage

Shared for create and edit routes. Form fields: Workout Name, Rounds, SoundTheme select, exercise list. Each exercise row has name, work seconds, rest seconds, and a delete button. Live total-time calculation updates as fields change. "Add Exercise" appends a blank row. "Save & Start" saves then navigates to `/run/:id`. Validation errors block submission and display inline messages.

---

## Workout Runner State Machine (`src/hooks/useWorkoutRunner.ts`)

```
ready → get_ready (10 s) → work → rest → [repeat] → finished
                                         ↑___________|
                          (advance exercise/round on rest→work transition)
```

### State Shape

```ts
{
  phase: 'ready' | 'get_ready' | 'work' | 'rest' | 'paused' | 'finished'
  currentExerciseIndex: number
  currentRound: number        // 1-based
  secondsRemaining: number
  startedAt: Date | null
  stepsCompleted: number
}
```

### Implementation Details

- A `setInterval` (1 s) stored in `useRef` drives the countdown.
- `useEffect` watches `secondsRemaining`: when it reaches 0, it calls `advancePhase()`.
- `advancePhase()` computes the next phase and new `secondsRemaining` from the workout definition.
- `pause()` clears the interval and sets `phase = 'paused'`.
- `resume()` restarts the interval from the stored remaining time.
- `skip()` immediately calls `advancePhase()`.
- `restart()` resets `secondsRemaining` to the current phase's full duration.
- `progressPercent` is derived: `(stepsCompleted / totalSteps) * 100`.

### Phase Backgrounds

| Phase | Background | Text |
|-------|-----------|------|
| `ready` / `get_ready` | dark | white |
| `work` | white | dark |
| `rest` | black | white |
| `paused` | dark grey | white |
| `finished` | `#FF7F11` (primary) | white |

On `finished`, the page shows total elapsed time and a "Finish & Save" button that writes the `WorkoutRun` to IndexedDB then navigates to `/`.

### Landscape Layout

When `(orientation: landscape) and (max-height: 500px)`, the Run page switches to a side-by-side layout: workout info (name, exercise, round) on the left, timer on the right. The `.landscape-hide` utility class is applied to elements that should be hidden in this mode (e.g. progress bar, full nav).

---

## Voice Congratulations (`src/lib/voiceCongrats.ts`)

### Overview

When the workout transitions to `finished`, the app speaks a randomly selected slang congratulations phrase using the Web Speech API `SpeechSynthesis` interface. This plays **after** the `playFinish` tone sequence completes.

### Phrase Pool

A static exported array of at least 15 phrases in `src/lib/voiceCongrats.ts`:

```ts
export const CONGRATS_PHRASES = [
  "You absolutely smashed it!",
  "That's what I'm talking about, legend!",
  "Crushed it like a boss!",
  "No cap, you just went off!",
  "Straight fire, keep that energy!",
  "Bussin' workout, no cap!",
  "You ate that up and left no crumbs!",
  "Big W, you're built different!",
  "Slay, that grind was real!",
  "Lowkey iconic performance right there!",
  "You went full beast mode, respect!",
  "That was an absolute banger of a session!",
  "Sheesh, you did not come to play!",
  "Main character energy, let's go!",
  "That workout just got bodied by you!",
]
```

### `speakCongrats()` Function

```ts
export function speakCongrats(): void
```

- Checks `typeof window.speechSynthesis !== 'undefined'` — if unsupported, returns silently with no user-facing error.
- Picks a phrase at random: `CONGRATS_PHRASES[Math.floor(Math.random() * CONGRATS_PHRASES.length)]`.
- Creates a `SpeechSynthesisUtterance` with the default system voice, default rate, and default pitch.
- Calls `window.speechSynthesis.speak(utterance)`.

### Sequencing with `playFinish`

Inside `useWorkoutRunner`, when `advancePhase()` transitions to `finished`:

1. `playFinish()` is called (C5→E5→G5→C6 tone sequence via Web Audio API).
2. The total duration of the `playFinish` sequence is known (approx. 1.6 s). After this delay, `speakCongrats()` is called via `setTimeout`.

This ensures the voice does not overlap the musical tones.

### Non-interruption

Once `speakCongrats()` has called `speechSynthesis.speak()`, no further interaction on the finished screen cancels or interrupts the utterance. The utterance runs to completion naturally.

---

## Audio System (`src/lib/audio.ts`)

### Factory Function

```ts
function createAudioPlayer(ctx: AudioContext, theme: SoundTheme): AudioPlayer
```

Returns `{ playTick, playPhaseEnd, playStart, playRest, playFinish }`.

The `AudioContext` is created once and stored in a `useRef` inside `useWorkoutRunner`. Before any sound is played, the hook calls `ctx.resume()` to satisfy iOS Safari's autoplay policy.

### Sound Events

| Event | Trigger |
|-------|---------|
| `playTick` | Last 3 s of any phase — called once per second |
| `playPhaseEnd` | Phase reaches 0 s |
| `playStart` | `work` phase begins |
| `playRest` | `rest` phase begins |
| `playFinish` | `finished` phase entered — plays C5→E5→G5→C6 ascending sequence |

### Waveforms by Theme

| Theme | Waveform |
|-------|----------|
| `classic` | Square (beeps) + Sine (tones) |
| `electronic` | Sawtooth |
| `vibrant` | Sine |

---

## Routing & Navigation

Wouter `<Switch>` handles all client-side routes. `BottomNav` is rendered at the `App` level but checks `useRoute('/run/:id')` and returns `null` when matched, satisfying the requirement to hide navigation during an active run. A catch-all route at `*` renders `<Redirect to="/" />`.

---

## Theming & Styling

### Tailwind Config

```ts
// tailwind.config.ts
darkMode: ["class"]
theme.extend.colors: mapped from CSS custom properties (var(--primary), etc.)
```

### CSS Custom Properties (`src/index.css`)

```css
:root {
  --primary: 28 100% 53%;   /* #FF7F11 */
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  /* ... */
}
.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

Values are in `H S% L%` format (no `hsl()` wrapper) for use with Tailwind's opacity modifier syntax.

### Fonts

- **Inter** — default sans-serif, loaded via CSS `@import` or `<link>`
- **JetBrains Mono** — monospace, applied to the timer display

### Landscape Utility

```css
@media (orientation: landscape) and (max-height: 500px) {
  .landscape-hide { display: none; }
  .landscape-side-by-side { flex-direction: row; }
}
```

---

## PWA Configuration

### `vite.config.ts`

```ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    runtimeCaching: [
      { urlPattern: /^https:\/\/fonts\./, handler: 'CacheFirst' },
      { urlPattern: /./, handler: 'StaleWhileRevalidate' },
    ],
  },
  manifest: {
    name: 'Personal PT',
    short_name: 'PersonalPT',
    theme_color: '#FF7F11',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    icons: [/* 192×192, 512×512 */],
  },
})
```

The service worker caches the app shell on first visit so the app is fully functional offline on subsequent visits. The app is installable via "Add to Home Screen" on iOS Safari and Android Chrome.

---

## Optional Backend Stub (`server/index.ts`)

A minimal Express app with no active routes. When `DATABASE_URL` is set, it initialises a Drizzle ORM client pointing to PostgreSQL. The shared schemas in `src/shared/schema.ts` export Drizzle table definitions via `drizzle-zod` for use here when the backend is activated.
