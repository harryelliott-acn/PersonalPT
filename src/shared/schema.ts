import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

// ---------------------------------------------------------------------------
// Exercise
// ---------------------------------------------------------------------------

export const exerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Exercise name is required"),
  durationSec: z.number().int().positive("Work duration must be positive"),
  restSec: z.number().int().min(0, "Rest duration cannot be negative"),
})

export type Exercise = z.infer<typeof exerciseSchema>

export function newExercise(overrides?: Partial<Exercise>): Exercise {
  return {
    id: uuidv4(),
    name: "",
    durationSec: 30,
    restSec: 10,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Workout
// ---------------------------------------------------------------------------

export const soundOptionSchema = z.enum(["classic", "electronic", "vibrant"])
export type SoundOption = z.infer<typeof soundOptionSchema>

export const workoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Workout name is required"),
  isPreset: z.boolean(),
  exercises: z.array(exerciseSchema).min(1, "At least one exercise is required"),
  rounds: z.number().int().positive().default(1),
  colorAccent: z.string().optional(),
  soundOption: soundOptionSchema,
  createdAt: z.date(),
  updatedAt: z.date().optional(),
})

export type Workout = z.infer<typeof workoutSchema>

export function newWorkout(overrides?: Partial<Workout>): Workout {
  return {
    id: uuidv4(),
    name: "",
    isPreset: false,
    exercises: [],
    rounds: 1,
    soundOption: "classic",
    createdAt: new Date(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// WorkoutRun
// ---------------------------------------------------------------------------

export const workoutRunSchema = z.object({
  id: z.string().uuid(),
  workoutId: z.string(),
  workoutName: z.string(),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  totalSecondsPlanned: z.number().int().nonnegative(),
  totalSecondsCompleted: z.number().int().nonnegative().optional(),
  stepsPlanned: z.number().int().nonnegative(),
  stepsCompleted: z.number().int().nonnegative(),
  completed: z.boolean(),
})

export type WorkoutRun = z.infer<typeof workoutRunSchema>

export function newWorkoutRun(overrides: Partial<WorkoutRun> & Pick<WorkoutRun, "workoutId" | "workoutName" | "stepsPlanned" | "totalSecondsPlanned">): WorkoutRun {
  return {
    id: uuidv4(),
    startedAt: new Date(),
    stepsCompleted: 0,
    completed: false,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Total planned seconds for a workout (work + rest) × rounds */
export function totalWorkoutSeconds(workout: Workout): number {
  const perRound = workout.exercises.reduce(
    (sum, ex) => sum + ex.durationSec + ex.restSec,
    0
  )
  return perRound * workout.rounds
}

/** Total steps (work phases) for a workout */
export function totalWorkoutSteps(workout: Workout): number {
  return workout.exercises.length * workout.rounds
}
