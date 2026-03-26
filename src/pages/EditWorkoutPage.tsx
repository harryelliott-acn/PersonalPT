import { useEffect, useState } from "react"
import { useLocation, useParams } from "wouter"
import { Trash2, Plus, ChevronLeft } from "lucide-react"
import { getWorkout, saveWorkout } from "../lib/db"
import type { Workout, Exercise } from "../shared/schema"
import { newWorkout, newExercise, totalWorkoutSeconds } from "../shared/schema"

export function EditWorkoutPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const isEdit = Boolean(params.id)

  const [workout, setWorkout] = useState<Workout>(() => newWorkout())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (params.id) {
      getWorkout(params.id).then((w) => {
        if (w) setWorkout({ ...w, updatedAt: undefined })
        setLoading(false)
      })
    }
  }, [params.id])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!workout.name.trim()) errs.name = "Workout name is required"
    if (workout.exercises.length === 0) errs.exercises = "Add at least one exercise"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function save(): Promise<string> {
    const now = new Date()
    const toSave: Workout = {
      ...workout,
      name: workout.name.trim(),
      createdAt: workout.createdAt ?? now,
      updatedAt: isEdit ? now : undefined,
    }
    await saveWorkout(toSave)
    return toSave.id
  }

  async function handleSave() {
    if (!validate()) return
    await save()
    navigate("/")
  }

  async function handleSaveAndStart() {
    if (!validate()) return
    const id = await save()
    navigate(`/run/${id}`)
  }

  function updateField<K extends keyof Workout>(key: K, value: Workout[K]) {
    setWorkout((w) => ({ ...w, [key]: value }))
  }

  function addExercise() {
    setWorkout((w) => ({ ...w, exercises: [...w.exercises, newExercise()] }))
  }

  function removeExercise(id: string) {
    setWorkout((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== id) }))
  }

  function updateExercise(id: string, key: keyof Exercise, value: string | number) {
    setWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((e) => (e.id === id ? { ...e, [key]: value } : e)),
    }))
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>

  const totalSec = totalWorkoutSeconds(workout)
  const totalMin = Math.round(totalSec / 60)

  return (
    <div className="pb-24">
      <header className="flex items-center gap-2 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{isEdit ? "Edit Workout" : "New Workout"}</h1>
      </header>

      <div className="px-4 flex flex-col gap-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Workout Name</label>
          <input
            type="text"
            value={workout.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="e.g. Morning HIIT"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
          {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Rounds */}
        <div>
          <label className="block text-sm font-medium mb-1">Rounds</label>
          <input
            type="number"
            min={1}
            value={workout.rounds}
            onChange={(e) => updateField("rounds", Math.max(1, Number(e.target.value)))}
            className="w-24 bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Audio */}
        <div>
          <label className="block text-sm font-medium mb-1">Audio Theme</label>
          <select
            value={workout.soundOption}
            onChange={(e) => updateField("soundOption", e.target.value as Workout["soundOption"])}
            className="bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="classic">Classic</option>
            <option value="electronic">Electronic</option>
            <option value="vibrant">Vibrant</option>
          </select>
        </div>

        {/* Exercises */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Exercises</label>
            <span className="text-xs text-muted-foreground">Total: {totalMin} min</span>
          </div>
          {errors.exercises && <p className="text-destructive text-xs mb-2">{errors.exercises}</p>}

          <div className="flex flex-col gap-3">
            {workout.exercises.map((ex, i) => (
              <div key={ex.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}</span>
                  <input
                    type="text"
                    value={ex.name}
                    onChange={(e) => updateExercise(ex.id, "name", e.target.value)}
                    placeholder="Exercise name"
                    className="flex-1 bg-transparent border-b border-border pb-1 text-sm outline-none"
                  />
                  <button
                    onClick={() => removeExercise(ex.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove exercise"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex gap-4 pl-7">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Work (sec)</label>
                    <input
                      type="number"
                      min={1}
                      value={ex.durationSec}
                      onChange={(e) => updateExercise(ex.id, "durationSec", Math.max(1, Number(e.target.value)))}
                      className="w-full bg-transparent border-b border-border pb-1 text-sm outline-none mt-0.5"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Rest (sec)</label>
                    <input
                      type="number"
                      min={0}
                      value={ex.restSec}
                      onChange={(e) => updateExercise(ex.id, "restSec", Math.max(0, Number(e.target.value)))}
                      className="w-full bg-transparent border-b border-border pb-1 text-sm outline-none mt-0.5"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addExercise}
            className="mt-3 w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <Plus size={16} />
            Add Exercise
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 mt-6 flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 bg-muted text-foreground rounded-xl py-3 text-sm font-semibold"
        >
          Save
        </button>
        <button
          onClick={handleSaveAndStart}
          className="flex-1 text-white rounded-xl py-3 text-sm font-semibold"
          style={{ backgroundColor: "#FF5D12" }}
        >
          Save &amp; Start
        </button>
      </div>
    </div>
  )
}
