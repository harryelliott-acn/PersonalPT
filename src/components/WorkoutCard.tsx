import { useState, useRef, useEffect } from "react"
import { Link } from "wouter"
import { MoreVertical, Play, Pencil, Trash2 } from "lucide-react"
import type { Workout } from "../shared/schema"
import { totalWorkoutSeconds } from "../shared/schema"

interface WorkoutCardProps {
  workout: Workout
  onDelete?: (id: string) => void
}

export function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const totalMin = Math.round(totalWorkoutSeconds(workout) / 60)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  return (
    <div
      className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3"
      style={workout.colorAccent ? { borderLeftColor: workout.colorAccent, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight truncate">{workout.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""} · {totalMin} min
            {workout.rounds > 1 ? ` · ${workout.rounds} rounds` : ""}
          </p>
        </div>

        {/* Three-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Workout options"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-10 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[150px]">
              <Link
                href={`/edit/${workout.id}`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <Pencil size={15} />
                Edit Workout
              </Link>
              {!workout.isPreset && onDelete && (
                <button
                  onClick={() => { setMenuOpen(false); onDelete(workout.id) }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-muted w-full text-left transition-colors"
                >
                  <Trash2 size={15} />
                  Delete Workout
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Link href={`/run/${workout.id}`}>
        <button
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity active:opacity-80"
          style={{ backgroundColor: "#FF5D12" }}
        >
          <Play size={16} fill="white" />
          Start
        </button>
      </Link>
    </div>
  )
}
