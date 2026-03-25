# Requirements Document

## Introduction

Personal PT is a mobile-first, offline-capable Progressive Web App (PWA) for interval-based workouts. The app requires no user accounts and stores all data locally in the browser using IndexedDB. Users can create, edit, and run timed interval workouts, review their workout history, and configure app preferences. A minimal Node.js/Express backend is included for optional future cloud sync via PostgreSQL, but the primary data layer is local-first.

## Glossary

- **App**: The Personal PT Progressive Web App as a whole.
- **Workout**: A named collection of exercises with a round count, sound option, and optional colour accent, stored in IndexedDB.
- **Preset**: A read-only Workout seeded into IndexedDB on first launch; cannot be deleted by the user.
- **Exercise**: An inline record within a Workout containing a name, work duration in seconds, and rest duration in seconds.
- **WorkoutRun**: A record capturing the execution of a Workout, including start/end times, steps planned vs completed, and completion status, stored in IndexedDB.
- **Phase**: A discrete state within an active workout session — one of: `ready`, `get_ready`, `work`, `rest`, `paused`, or `finished`.
- **Round**: One full pass through all exercises in a Workout.
- **DB**: The IndexedDB database named `workout-app-db` at version 1.
- **AudioContext**: A single persistent Web Audio API context used for all sound playback.
- **SoundTheme**: A named audio style (`classic`, `electronic`, or `vibrant`) that determines the waveform and tone used for workout sounds.
- **ServiceWorker**: The Workbox-managed service worker responsible for offline caching of the app shell.
- **PWA**: Progressive Web App — the installable, offline-capable form of the App.
- **WorkoutCard**: The UI component that displays a summary of a Workout on the Home screen.
- **EditWorkout**: The page/form used to create or modify a Workout.
- **Run**: The page that manages and displays an active workout session.
- **History**: The page that lists past WorkoutRuns.
- **Settings**: The page for theme and data management preferences.

---

## Requirements

### Requirement 1: Local Data Storage

**User Story:** As a user, I want my workouts and run history stored locally in my browser, so that I can use the app without an account or internet connection.

#### Acceptance Criteria

1. THE App SHALL initialise an IndexedDB database named `workout-app-db` at version 1 on first launch.
2. THE DB SHALL contain an object store named `workouts` with keyPath `id` and an index named `by-date` on the `createdAt` field.
3. THE DB SHALL contain an object store named `runs` with keyPath `id`, an index named `by-date` on `startedAt`, and an index named `by-workout` on `workoutId`.
4. WHEN the DB is created for the first time, THE App SHALL seed the three preset Workouts (`preset-classic`, `preset-core`, `preset-stretch`) into the `workouts` store.
5. IF the DB already exists at version 1, THEN THE App SHALL NOT re-seed preset Workouts.
6. THE App SHALL use the `idb` library to interact with IndexedDB.

---

### Requirement 2: Workout Data Model

**User Story:** As a user, I want each workout to capture its name, exercises, rounds, sound preference, and colour, so that I can distinguish and customise my workouts.

#### Acceptance Criteria

1. THE App SHALL represent each Workout with the fields: `id` (UUID string), `name` (string), `isPreset` (boolean), `exercises` (array of Exercise), `rounds` (integer, default 1), `colorAccent` (optional hex string), `soundOption` (one of `classic`, `electronic`, `vibrant`), `createdAt` (Date), and `updatedAt` (optional Date).
2. THE App SHALL represent each Exercise with the fields: `id` (UUID string), `name` (string), `durationSec` (integer), and `restSec` (integer).
3. THE App SHALL validate Workout and Exercise data against Zod schemas before writing to the DB.
4. IF a Workout fails Zod validation, THEN THE App SHALL reject the write and return a descriptive validation error.

---

### Requirement 3: Preset Workouts

**User Story:** As a user, I want pre-built workouts available on first launch, so that I can start exercising immediately without creating anything.

#### Acceptance Criteria

1. THE App SHALL seed a Workout named "7 Minute Workout" with id `preset-classic`, `isPreset: true`, 1 round, accent `#FF7F11`, `soundOption: classic`, and 11 exercises (Pressup, Crunch, Overhead Press, Leg Raise, Bicep Curl, Squat, Tricep Dip, Shoulder Raise, Lunge, Ab Rollout, Side Plank) each with 30s work and 10s rest.
2. THE App SHALL seed a Workout named "Core Crusher" with id `preset-core`, `isPreset: true`, 2 rounds, accent `#3B82F6`, `soundOption: classic`, and 8 exercises (Forearm Plank, Dead Bugs, Bicycle Crunch, Side Plank (Right), Side Plank (Left), Reverse Crunch, Mountain Climbers, Hollow Body Hold) each with 40s work and 10s rest.
3. THE App SHALL seed a Workout named "Quick Stretch" with id `preset-stretch`, `isPreset: true`, 1 round, accent `#10B981`, `soundOption: classic`, and 4 exercises: Neck Rolls (30s/5s), Shoulder Stretch (30s/5s), Hamstring Stretch (45s/10s), Quad Stretch (45s/10s).
4. THE WorkoutCard SHALL NOT display a "Delete Workout" option for Workouts where `isPreset` is `true`.

---

### Requirement 4: Workout CRUD

**User Story:** As a user, I want to create, edit, and delete my own workouts, so that I can build routines tailored to my needs.

#### Acceptance Criteria

1. WHEN a user submits the EditWorkout form with valid data, THE App SHALL write the Workout to the `workouts` store in the DB and navigate to the Home screen.
2. WHEN a user submits the EditWorkout form for an existing Workout, THE App SHALL update the existing record and set `updatedAt` to the current timestamp.
3. WHEN a user confirms deletion of a custom Workout, THE App SHALL remove the Workout record from the `workouts` store.
4. THE EditWorkout form SHALL include fields for: Workout Name, Rounds, Audio (SoundTheme select), and a list of Exercises each with name, work seconds, and rest seconds inputs.
5. THE EditWorkout form SHALL display a live total time calculation reflecting the sum of all exercise work and rest durations multiplied by the round count.
6. THE EditWorkout form SHALL provide an "Add Exercise" button that appends a new blank Exercise to the list.
7. THE EditWorkout form SHALL provide a delete button per Exercise that removes that Exercise from the list.
8. THE EditWorkout form SHALL provide a "Save & Start" button that saves the Workout and immediately navigates to `/run/:id`.
9. IF a user attempts to save a Workout with no name, THEN THE EditWorkout form SHALL display a validation error and prevent submission.
10. IF a user attempts to save a Workout with no exercises, THEN THE EditWorkout form SHALL display a validation error and prevent submission.

---

### Requirement 5: Home Screen

**User Story:** As a user, I want a home screen showing my workouts and activity stats, so that I can quickly pick a workout and track my progress.

#### Acceptance Criteria

1. THE Home screen SHALL display a stats bar containing the user's current day streak and total workout count, both derived from the `runs` store in the DB.
2. THE Home screen SHALL display a "Quick Start · Presets" section listing all Workouts where `isPreset` is `true`.
3. THE Home screen SHALL display a "Custom" section listing all Workouts where `isPreset` is `false`, with a "Create" button that navigates to `/create`.
4. THE Home screen SHALL render each Workout as a WorkoutCard.
5. THE WorkoutCard SHALL display the Workout name, total duration in minutes (rounded), and exercise count.
6. THE WorkoutCard SHALL include a three-dot menu with an "Edit Workout" option that navigates to `/edit/:id`.
7. THE WorkoutCard SHALL include a "Start" button styled with background colour `#FF5D12` and `rounded-xl` that navigates to `/run/:id`.

---

### Requirement 6: Active Workout Runner

**User Story:** As a user, I want a guided, timed workout runner that progresses through exercises automatically, so that I can focus on exercising rather than tracking time.

#### Acceptance Criteria

1. THE Run page SHALL manage the following Phase sequence: `ready` → `get_ready` (10-second countdown) → `work` → `rest` → (repeat for all exercises and rounds) → `finished`.
2. WHEN the Phase is `get_ready`, THE Run page SHALL display a 10-second countdown before the first work phase begins.
3. WHEN the Phase is `work`, THE Run page SHALL display a white (default) background.
4. WHEN the Phase is `rest`, THE Run page SHALL display a black background with white text.
5. WHEN the Phase is `paused`, THE Run page SHALL display a dark grey background.
6. WHEN the Phase is `finished`, THE Run page SHALL display a full-screen primary orange background showing total time elapsed and a "Finish & Save" button.
7. THE Run page SHALL display the remaining phase time as a large monospace number (80px on mobile, 150px on desktop).
8. THE Run page SHALL display playback controls: a Restart Phase button, a central Pause/Play button, and a Skip button.
9. THE Run page SHALL display a progress bar indicating overall workout completion.
10. WHEN a user activates the "Finish & Save" button, THE Run page SHALL write a WorkoutRun record to the `runs` store and navigate to the Home screen.
11. WHEN the device orientation is landscape and viewport height is 500px or less, THE Run page SHALL switch to a side-by-side layout with workout info on the left and the timer on the right.
12. THE App SHALL hide the bottom navigation bar on all `/run/*` routes.

---

### Requirement 7: WorkoutRun Data Model

**User Story:** As a user, I want each completed workout session recorded with timing and completion details, so that I can review my history accurately.

#### Acceptance Criteria

1. THE App SHALL represent each WorkoutRun with the fields: `id` (UUID string), `workoutId` (string), `workoutName` (string snapshot), `startedAt` (Date), `endedAt` (optional Date), `totalSecondsPlanned` (integer), `totalSecondsCompleted` (optional integer), `stepsPlanned` (integer), `stepsCompleted` (integer), and `completed` (boolean).
2. WHEN a WorkoutRun is saved, THE App SHALL set `workoutName` to the Workout's name at the time of the run, not a reference to the current name.
3. THE App SHALL validate WorkoutRun data against a Zod schema before writing to the DB.
4. IF a WorkoutRun fails Zod validation, THEN THE App SHALL reject the write and return a descriptive validation error.

---

### Requirement 8: Workout History

**User Story:** As a user, I want to view a log of my past workout sessions, so that I can track my consistency over time.

#### Acceptance Criteria

1. THE History page SHALL display all WorkoutRun records from the `runs` store sorted by `startedAt` descending.
2. THE History page SHALL display for each WorkoutRun: the workout name, date and time, duration, and a completion indicator.

---

### Requirement 9: Audio Feedback

**User Story:** As a user, I want audio cues during my workout, so that I know when phases are changing without watching the screen.

#### Acceptance Criteria

1. THE App SHALL create a single persistent AudioContext instance (ref-based) for all sound playback.
2. WHEN the AudioContext is in a suspended state, THE App SHALL resume it before playing any sound, to support iOS Safari.
3. WHEN the last 3 seconds of any Phase are counting down, THE App SHALL call `playTick` once per second.
4. WHEN a Phase reaches 0 seconds, THE App SHALL call `playPhaseEnd`.
5. WHEN the `work` Phase begins, THE App SHALL call `playStart`.
6. WHEN the `rest` Phase begins, THE App SHALL call `playRest`.
7. WHEN the `finished` Phase is entered, THE App SHALL call `playFinish`, which SHALL play a C5→E5→G5→C6 ascending tone sequence.
8. WHEN the SoundTheme is `classic`, THE App SHALL use square and sine waveforms for audio generation.
9. WHEN the SoundTheme is `electronic`, THE App SHALL use a sawtooth waveform for audio generation.
10. WHEN the SoundTheme is `vibrant`, THE App SHALL use a sine waveform for audio generation.

---

### Requirement 10: Settings

**User Story:** As a user, I want to control the app theme and clear my history, so that I can personalise the experience and manage my data.

#### Acceptance Criteria

1. THE Settings page SHALL provide a theme selector with options: Light, Dark, and System.
2. WHEN a user selects a theme, THE App SHALL apply the selected theme immediately by toggling the `.dark` class on the `<html>` element via `next-themes`.
3. THE Settings page SHALL provide a "Clear Workout History" action styled as a destructive action.
4. WHEN a user confirms the "Clear Workout History" action, THE App SHALL delete all records from the `runs` store in the DB.

---

### Requirement 11: PWA and Offline Support

**User Story:** As a user, I want to install the app on my device and use it offline, so that I can work out anywhere without an internet connection.

#### Acceptance Criteria

1. THE App SHALL include a Web App Manifest with name "Personal PT", theme colour `#FF7F11`, `display: standalone`, and `orientation: portrait`.
2. THE App SHALL register a ServiceWorker via `vite-plugin-pwa` and Workbox that caches the app shell for offline use.
3. WHEN the App is loaded offline after a prior online visit, THE ServiceWorker SHALL serve the cached app shell so the App remains fully functional.
4. THE App SHALL be installable via "Add to Home Screen" on iOS Safari and Android Chrome.

---

### Requirement 12: Routing and Navigation

**User Story:** As a user, I want clear navigation between all sections of the app, so that I can move between workouts, history, and settings easily.

#### Acceptance Criteria

1. THE App SHALL implement client-side routing using Wouter with the following routes: `/` (Home), `/create` (EditWorkout), `/edit/:id` (EditWorkout), `/run/:id` (Run), `/history` (History), `/settings` (Settings).
2. THE App SHALL display a fixed bottom navigation bar on all routes except `/run/*`.
3. WHEN a user navigates to a route that does not match any defined route, THE App SHALL redirect to `/`.

---

### Requirement 13: Theming and Styling

**User Story:** As a user, I want a visually consistent, accessible interface that supports dark mode, so that I can use the app comfortably in any lighting condition.

#### Acceptance Criteria

1. THE App SHALL use Tailwind CSS v3 with `darkMode: ["class"]` configuration.
2. THE App SHALL define CSS custom properties for all theme colours in `:root` and `.dark` using H S% L% format without the `hsl()` wrapper.
3. THE App SHALL set the primary accent colour to `#FF7F11` (CSS variable `--primary: 28 100% 53%`).
4. THE App SHALL load Inter as the default sans-serif font and JetBrains Mono as the monospace font.
5. THE App SHALL apply a landscape layout helper via `@media (orientation: landscape) and (max-height: 500px)` for the `.landscape-hide` utility class.

---

### Requirement 14: Schema Validation and Shared Types

**User Story:** As a developer, I want shared Zod schemas and TypeScript types for all data models, so that validation is consistent between the client and any future server integration.

#### Acceptance Criteria

1. THE App SHALL define Zod schemas for Workout, Exercise, and WorkoutRun in `shared/schema.ts`.
2. THE App SHALL export TypeScript types inferred from those Zod schemas for use across client and server code.
3. WHERE a PostgreSQL backend is configured, THE App SHALL use Drizzle ORM table definitions derived from the same schemas via `drizzle-zod`.
4. THE App SHALL use `uuid` to generate all `id` values for new Workout, Exercise, and WorkoutRun records.
