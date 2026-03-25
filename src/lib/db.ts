import { openDB, type IDBPDatabase } from "idb"
import { workoutSchema, workoutRunSchema, type Workout, type WorkoutRun } from "../shared/schema"
import { PRESETS } from "./presets"

const DB_NAME = "workout-app-db"
const DB_VERSION = 1

type AppDB = IDBPDatabase<unknown>

let dbPromise: Promise<AppDB> | null = null

export function getDB(): Promise<AppDB> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const workoutsStore = db.createObjectStore("workouts", { keyPath: "id" })
          workoutsStore.createIndex("by-date", "createdAt")

          const runsStore = db.createObjectStore("runs", { keyPath: "id" })
          runsStore.createIndex("by-date", "startedAt")
          runsStore.createIndex("by-workout", "workoutId")
        }
      },
      async blocked() {
        console.warn("IndexedDB blocked — close other tabs using this app")
      },
    }).then(async (db) => {
      // Seed presets on first open
      const tx = db.transaction("workouts", "readwrite")
      const existing = await tx.store.get("preset-classic")
      if (!existing) {
        for (const preset of PRESETS) {
          await tx.store.put(serializeWorkout(preset))
        }
      }
      await tx.done
      return db
    })
  }
  return dbPromise
}

// ---------------------------------------------------------------------------
// Serialization helpers (Date → ISO string for IndexedDB)
// ---------------------------------------------------------------------------

function serializeWorkout(w: Workout): Record<string, unknown> {
  return {
    ...w,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt?.toISOString(),
  }
}

function deserializeWorkout(raw: Record<string, unknown>): Workout {
  return workoutSchema.parse({
    ...raw,
    createdAt: new Date(raw.createdAt as string),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt as string) : undefined,
  })
}

function serializeRun(r: WorkoutRun): Record<string, unknown> {
  return {
    ...r,
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt?.toISOString(),
  }
}

function deserializeRun(raw: Record<string, unknown>): WorkoutRun {
  return workoutRunSchema.parse({
    ...raw,
    startedAt: new Date(raw.startedAt as string),
    endedAt: raw.endedAt ? new Date(raw.endedAt as string) : undefined,
  })
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export async function getAllWorkouts(): Promise<Workout[]> {
  const db = await getDB()
  const raws = await db.getAll("workouts") as Record<string, unknown>[]
  return raws.map(deserializeWorkout)
}

export async function getWorkout(id: string): Promise<Workout | undefined> {
  const db = await getDB()
  const raw = await db.get("workouts", id) as Record<string, unknown> | undefined
  return raw ? deserializeWorkout(raw) : undefined
}

export async function saveWorkout(workout: Workout): Promise<void> {
  const validated = workoutSchema.parse(workout)
  const db = await getDB()
  await db.put("workouts", serializeWorkout(validated))
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("workouts", id)
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export async function getAllRuns(): Promise<WorkoutRun[]> {
  const db = await getDB()
  const raws = await db.getAll("runs") as Record<string, unknown>[]
  return raws.map(deserializeRun).sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
  )
}

export async function saveRun(run: WorkoutRun): Promise<void> {
  const validated = workoutRunSchema.parse(run)
  const db = await getDB()
  await db.put("runs", serializeRun(validated))
}

export async function clearAllRuns(): Promise<void> {
  const db = await getDB()
  await db.clear("runs")
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

export async function getStats(): Promise<{ streak: number; totalCount: number }> {
  const runs = await getAllRuns()
  const totalCount = runs.length

  if (totalCount === 0) return { streak: 0, totalCount: 0 }

  // Calculate day streak from most recent run backwards
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const runDates = new Set(
    runs.map((r) => {
      const d = new Date(r.startedAt)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    })
  )

  let streak = 0
  let cursor = new Date(today)

  while (runDates.has(cursor.getTime())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return { streak, totalCount }
}
