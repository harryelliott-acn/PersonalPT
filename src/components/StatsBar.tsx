import { useEffect, useState } from "react"
import { getStats } from "../lib/db"
import { Flame, Dumbbell } from "lucide-react"

export function StatsBar() {
  const [stats, setStats] = useState({ streak: 0, totalCount: 0 })

  useEffect(() => {
    getStats().then(setStats)
  }, [])

  return (
    <div className="flex gap-4 px-4 py-3">
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 flex-1">
        <Flame size={18} className="text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Day Streak</p>
          <p className="text-lg font-bold leading-tight">{stats.streak}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 flex-1">
        <Dumbbell size={18} className="text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Total Workouts</p>
          <p className="text-lg font-bold leading-tight">{stats.totalCount}</p>
        </div>
      </div>
    </div>
  )
}
