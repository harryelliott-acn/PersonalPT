import { useEffect, useState } from "react"
import { Link } from "wouter"
import { Plus } from "lucide-react"
import { getAllWorkouts, deleteWorkout } from "../lib/db"
import type { Workout } from "../shared/schema"
import { StatsBar } from "../components/StatsBar"
import { WorkoutCard } from "../components/WorkoutCard"

export function HomePage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])

  async function load() {
    setWorkouts(await getAllWorkouts())
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm("Delete this workout?")) return
    await deleteWorkout(id)
    load()
  }

  const presets = workouts.filter((w) => w.isPreset)
  const custom = workouts.filter((w) => !w.isPreset)

  return (
    <div className="pb-20">
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold">Personal PT</h1>
      </header>

      <StatsBar />

      <section className="px-4 mt-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Start · Presets
        </h2>
        <div className="flex flex-col gap-3">
          {presets.map((w) => (
            <WorkoutCard key={w.id} workout={w} onDelete={handleDelete} />
          ))}
        </div>
      </section>

      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Custom
          </h2>
          <Link href="/create">
            <button className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Plus size={16} />
              Create
            </button>
          </Link>
        </div>
        {custom.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No custom workouts yet.{" "}
            <Link href="/create" className="text-primary underline">
              Create one!
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {custom.map((w) => (
              <WorkoutCard key={w.id} workout={w} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
