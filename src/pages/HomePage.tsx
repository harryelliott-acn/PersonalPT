import { useEffect, useState } from "react"
import { Link } from "wouter"
import { getAllWorkouts, deleteWorkout } from "../lib/db"
import type { Workout } from "../shared/schema"
import { StatsBar } from "../components/StatsBar"
import { WorkoutCard } from "../components/WorkoutCard"
import { useDataVersion } from "../lib/sync"

export function HomePage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const dataVersion = useDataVersion()

  async function load() {
    setWorkouts(await getAllWorkouts())
  }

  useEffect(() => { load() }, [dataVersion])

  async function handleDelete(id: string) {
    if (!confirm("Delete this workout?")) return
    await deleteWorkout(id)
    load()
  }

  const presets = workouts.filter((w) => w.isPreset)
  const custom = workouts.filter((w) => !w.isPreset)

  return (
    <div className="pb-28">
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-5xl font-bold text-center tracking-tight">pump off</h1>
      </header>

      <StatsBar />

      <section className="px-4 mt-4">
        <div className="flex flex-col gap-3">
          {presets.map((w) => (
            <WorkoutCard key={w.id} workout={w} onDelete={handleDelete} />
          ))}
        </div>
      </section>

      <section className="px-4 mt-6">
        <div className="flex justify-center mb-3">
          <Link href="/create" className="text-sm font-medium text-foreground underline">
            create new one
          </Link>
        </div>
        {custom.length > 0 && (
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
