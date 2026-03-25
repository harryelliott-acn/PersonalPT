import { useEffect, useState } from "react"
import { getAllRuns } from "../lib/db"
import type { WorkoutRun } from "../shared/schema"
import { CheckCircle, XCircle } from "lucide-react"

export function HistoryPage() {
  const [runs, setRuns] = useState<WorkoutRun[]>([])

  useEffect(() => { getAllRuns().then(setRuns) }, [])

  return (
    <div className="pb-20">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">History</h1>
      </header>

      {runs.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No workouts yet. Go smash one!</p>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {runs.map((run) => {
            const date = new Date(run.startedAt)
            const durationSec = run.totalSecondsCompleted ?? 0
            const durationMin = Math.floor(durationSec / 60)
            const durationSecRem = durationSec % 60

            return (
              <div key={run.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="flex-shrink-0">
                  {run.completed
                    ? <CheckCircle size={22} className="text-green-500" />
                    : <XCircle size={22} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{run.workoutName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono font-semibold">
                    {String(durationMin).padStart(2, "0")}:{String(durationSecRem).padStart(2, "0")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {run.stepsCompleted}/{run.stepsPlanned} steps
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
