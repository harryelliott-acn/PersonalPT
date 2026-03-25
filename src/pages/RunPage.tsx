import { useEffect, useState } from "react"
import { useParams, useLocation } from "wouter"
import { SkipForward, RotateCcw, Pause, Play } from "lucide-react"
import { getWorkout } from "../lib/db"
import type { Workout } from "../shared/schema"
import { useWorkoutRunner } from "../hooks/useWorkoutRunner"
import { ProgressBar } from "../components/ProgressBar"

function PhaseLabel({ phase }: { phase: string }) {
  const labels: Record<string, string> = {
    ready: "Get Ready",
    get_ready: "Get Ready",
    work: "Work",
    rest: "Rest",
    paused: "Paused",
    finished: "Done!",
  }
  return <span className="text-lg font-semibold uppercase tracking-widest opacity-80">{labels[phase] ?? phase}</span>
}

function phaseBackground(phase: string): string {
  switch (phase) {
    case "work": return "bg-white text-gray-900"
    case "rest": return "bg-black text-white"
    case "paused": return "bg-gray-800 text-white"
    case "finished": return "text-white"
    default: return "bg-gray-900 text-white"
  }
}

function RunnerUI({ workout }: { workout: Workout }) {
  const [, navigate] = useLocation()
  const runner = useWorkoutRunner(workout)
  const { state, progressPercent, currentExercise, play, pause, skip, restartPhase, finishAndSave } = runner
  const isPaused = state.phase === "paused"
  const isFinished = state.phase === "finished"

  const elapsedSec = state.startedAt
    ? Math.round((Date.now() - state.startedAt.getTime()) / 1000)
    : 0
  const elapsedMin = Math.floor(elapsedSec / 60)
  const elapsedSecRem = elapsedSec % 60

  async function handleFinish() {
    await finishAndSave()
    navigate("/")
  }

  if (isFinished) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 text-white" style={{ backgroundColor: "#FF7F11" }}>
        <h1 className="text-4xl font-bold">Workout Done!</h1>
        <p className="text-6xl font-mono font-bold">
          {String(elapsedMin).padStart(2, "0")}:{String(elapsedSecRem).padStart(2, "0")}
        </p>
        <p className="text-lg opacity-80">Total time</p>
        <button
          onClick={handleFinish}
          className="mt-4 bg-white text-orange-500 font-bold px-8 py-4 rounded-2xl text-lg active:scale-95 transition-transform"
        >
          Finish &amp; Save
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 flex flex-col ${phaseBackground(state.phase)} transition-colors duration-300`}
      style={state.phase === "finished" ? { backgroundColor: "#FF7F11" } : undefined}>

      {/* Top info */}
      <div className="flex flex-col items-center pt-12 px-6 gap-1 landscape-hide">
        <PhaseLabel phase={state.phase} />
        {currentExercise && (
          <p className="text-xl font-bold mt-1">{currentExercise.name}</p>
        )}
        <p className="text-sm opacity-60 mt-0.5">
          Round {state.currentRound}/{workout.rounds} · Exercise {state.currentExerciseIndex + 1}/{workout.exercises.length}
        </p>
      </div>

      {/* Landscape side-by-side */}
      <div className="hidden landscape-side-by-side flex-1 items-center px-8 gap-8">
        <div className="flex flex-col gap-1">
          <PhaseLabel phase={state.phase} />
          {currentExercise && <p className="text-2xl font-bold">{currentExercise.name}</p>}
          <p className="text-sm opacity-60">
            Round {state.currentRound}/{workout.rounds} · {state.currentExerciseIndex + 1}/{workout.exercises.length}
          </p>
        </div>
      </div>

      {/* Timer */}
      <div className="flex-1 flex items-center justify-center">
        <span
          className="font-mono font-bold leading-none select-none"
          style={{ fontSize: "clamp(80px, 25vw, 150px)" }}
        >
          {state.secondsRemaining}
        </span>
      </div>

      {/* Progress */}
      <div className="px-6 pb-4 landscape-hide">
        <ProgressBar percent={progressPercent} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-8 pb-12 landscape-hide">
        <button
          onClick={restartPhase}
          className="p-3 rounded-full opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Restart phase"
        >
          <RotateCcw size={28} />
        </button>
        <button
          onClick={isPaused ? play : pause}
          className="p-5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          aria-label={isPaused ? "Play" : "Pause"}
        >
          {isPaused ? <Play size={36} fill="currentColor" /> : <Pause size={36} fill="currentColor" />}
        </button>
        <button
          onClick={skip}
          className="p-3 rounded-full opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Skip phase"
        >
          <SkipForward size={28} />
        </button>
      </div>
    </div>
  )
}

export function RunPage() {
  const params = useParams<{ id: string }>()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params.id) { setNotFound(true); return }
    getWorkout(params.id).then((w) => {
      if (w) setWorkout(w)
      else setNotFound(true)
    })
  }, [params.id])

  if (notFound) return <div className="p-8 text-center text-muted-foreground">Workout not found.</div>
  if (!workout) return <div className="p-8 text-center text-muted-foreground">Loading…</div>

  return <RunnerUI workout={workout} />
}
