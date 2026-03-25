import { useRef, useState, useEffect, useCallback } from "react"
import type { Workout } from "../shared/schema"
import { totalWorkoutSeconds, totalWorkoutSteps, newWorkoutRun } from "../shared/schema"
import { createAudioPlayer } from "../lib/audio"
import { speakCongrats } from "../lib/voiceCongrats"
import { saveRun } from "../lib/db"

export type Phase = "ready" | "get_ready" | "work" | "rest" | "paused" | "finished"

interface RunnerState {
  phase: Phase
  currentExerciseIndex: number
  currentRound: number
  secondsRemaining: number
  startedAt: Date | null
  stepsCompleted: number
  prePhase: Phase | null // phase before pause
}

interface WorkoutRunner {
  state: RunnerState
  progressPercent: number
  currentExercise: Workout["exercises"][0] | null
  play: () => void
  pause: () => void
  skip: () => void
  restartPhase: () => void
  finishAndSave: () => Promise<void>
}

const GET_READY_DURATION = 10

export function useWorkoutRunner(workout: Workout): WorkoutRunner {
  const [state, setState] = useState<RunnerState>({
    phase: "ready",
    currentExerciseIndex: 0,
    currentRound: 1,
    secondsRemaining: 0,
    startedAt: null,
    stepsCompleted: 0,
    prePhase: null,
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null)

  function getAudioPlayer() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    if (!playerRef.current) {
      playerRef.current = createAudioPlayer(audioCtxRef.current, workout.soundOption)
    }
    return playerRef.current
  }

  function clearTick() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const advancePhase = useCallback((s: RunnerState): RunnerState => {
    const player = getAudioPlayer()

    switch (s.phase) {
      case "ready": {
        player.playStart()
        return { ...s, phase: "get_ready", secondsRemaining: GET_READY_DURATION, startedAt: new Date() }
      }

      case "get_ready": {
        player.playStart()
        const ex = workout.exercises[0]
        return { ...s, phase: "work", secondsRemaining: ex.durationSec, currentExerciseIndex: 0 }
      }

      case "work": {
        player.playRest()
        const ex = workout.exercises[s.currentExerciseIndex]
        return { ...s, phase: "rest", secondsRemaining: ex.restSec }
      }

      case "rest": {
        const nextExIndex = s.currentExerciseIndex + 1
        if (nextExIndex < workout.exercises.length) {
          // Move to next exercise in the same round
          player.playStart()
          const nextEx = workout.exercises[nextExIndex]
          return {
            ...s,
            phase: "work",
            currentExerciseIndex: nextExIndex,
            secondsRemaining: nextEx.durationSec,
            stepsCompleted: s.stepsCompleted + 1,
          }
        } else if (s.currentRound < workout.rounds) {
          // Start next round
          player.playStart()
          const nextRound = s.currentRound + 1
          const firstEx = workout.exercises[0]
          return {
            ...s,
            phase: "work",
            currentExerciseIndex: 0,
            currentRound: nextRound,
            secondsRemaining: firstEx.durationSec,
            stepsCompleted: s.stepsCompleted + 1,
          }
        } else {
          // All done
          const finalSteps = s.stepsCompleted + 1
          player.playFinish().then(() => speakCongrats())
          return { ...s, phase: "finished", stepsCompleted: finalSteps }
        }
      }

      default:
        return s
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout])

  function startTick() {
    clearTick()
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.phase === "paused" || prev.phase === "finished" || prev.phase === "ready") {
          return prev
        }

        const newSeconds = prev.secondsRemaining - 1
        const player = getAudioPlayer()

        // Tick sound for last 3 seconds
        if (newSeconds > 0 && newSeconds <= 3) {
          player.playTick()
        }

        if (newSeconds <= 0) {
          player.playPhaseEnd()
          const next = advancePhase(prev)
          if (next.phase === "finished") {
            clearTick()
          }
          return next
        }

        return { ...prev, secondsRemaining: newSeconds }
      })
    }, 1000)
  }

  // Auto-start when mounting
  useEffect(() => {
    setState((prev) => advancePhase(prev))
    startTick()
    return () => clearTick()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const play = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "paused") return prev
      return { ...prev, phase: prev.prePhase ?? "work", prePhase: null }
    })
    startTick()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pause = useCallback(() => {
    clearTick()
    setState((prev) => {
      if (prev.phase === "paused" || prev.phase === "finished") return prev
      return { ...prev, prePhase: prev.phase, phase: "paused" }
    })
  }, [])

  const skip = useCallback(() => {
    setState((prev) => {
      if (prev.phase === "finished" || prev.phase === "ready") return prev
      const next = advancePhase(prev)
      if (next.phase !== "finished") startTick()
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancePhase])

  const restartPhase = useCallback(() => {
    setState((prev) => {
      if (prev.phase === "finished" || prev.phase === "ready") return prev
      let duration = GET_READY_DURATION
      if (prev.phase === "work") duration = workout.exercises[prev.currentExerciseIndex].durationSec
      if (prev.phase === "rest") duration = workout.exercises[prev.currentExerciseIndex].restSec
      if (prev.phase === "paused") {
        const pp = prev.prePhase
        if (pp === "work") duration = workout.exercises[prev.currentExerciseIndex].durationSec
        else if (pp === "rest") duration = workout.exercises[prev.currentExerciseIndex].restSec
        startTick()
        return { ...prev, phase: pp ?? "work", prePhase: null, secondsRemaining: duration }
      }
      return { ...prev, secondsRemaining: duration }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout])

  const finishAndSave = useCallback(async () => {
    const s = state
    const endedAt = new Date()
    const elapsedSec = s.startedAt ? Math.round((endedAt.getTime() - s.startedAt.getTime()) / 1000) : 0

    const run = newWorkoutRun({
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt: s.startedAt ?? new Date(),
      endedAt,
      totalSecondsPlanned: totalWorkoutSeconds(workout),
      totalSecondsCompleted: elapsedSec,
      stepsPlanned: totalWorkoutSteps(workout),
      stepsCompleted: s.stepsCompleted,
      completed: s.phase === "finished",
    })

    await saveRun(run)
  }, [state, workout])

  const totalSteps = totalWorkoutSteps(workout)
  const progressPercent = totalSteps > 0 ? (state.stepsCompleted / totalSteps) * 100 : 0
  const currentExercise = workout.exercises[state.currentExerciseIndex] ?? null

  return { state, progressPercent, currentExercise, play, pause, skip, restartPhase, finishAndSave }
}
