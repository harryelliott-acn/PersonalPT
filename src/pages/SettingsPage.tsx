import { useTheme } from "next-themes"
import { useState } from "react"
import { clearAllRuns } from "../lib/db"
import { Sun, Moon, Monitor, Trash2 } from "lucide-react"

const THEMES = [
  { value: "light", label: "Light", icon: <Sun size={16} /> },
  { value: "dark", label: "Dark", icon: <Moon size={16} /> },
  { value: "system", label: "System", icon: <Monitor size={16} /> },
] as const

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [cleared, setCleared] = useState(false)

  async function handleClearHistory() {
    if (!confirm("Clear all workout history? This cannot be undone.")) return
    await clearAllRuns()
    setCleared(true)
  }

  return (
    <div className="pb-20">
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <div className="px-4 flex flex-col gap-6">
        {/* Theme */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Appearance</h2>
          <div className="bg-card border border-border rounded-2xl p-1 flex gap-1">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  theme === t.value
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Data</h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={handleClearHistory}
              className="w-full flex items-center gap-3 px-4 py-4 text-left text-destructive hover:bg-muted transition-colors"
            >
              <Trash2 size={18} />
              <div>
                <p className="text-sm font-semibold">Clear Workout History</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cleared ? "History cleared." : "Permanently removes all past workout sessions."}
                </p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
