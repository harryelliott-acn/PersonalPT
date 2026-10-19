import { useTheme } from "next-themes"
import { useState } from "react"
import { clearAllRuns } from "../lib/db"
import { Sun, Moon, Monitor, Trash2, Cloud, RefreshCw, LogOut } from "lucide-react"
import { useSync, syncNow, signIn, signUp, signOut } from "../lib/sync"

const THEMES = [
  { value: "light", label: "Light", icon: <Sun size={16} /> },
  { value: "dark", label: "Dark", icon: <Moon size={16} /> },
  { value: "system", label: "System", icon: <Monitor size={16} /> },
] as const

function AccountSection() {
  const sync = useSync()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(mode: "in" | "up") {
    setBusy(true)
    setMessage(null)
    if (mode === "in") {
      setMessage(await signIn(email, password))
    } else {
      const r = await signUp(email, password)
      setMessage(r.error ?? r.info ?? null)
    }
    setBusy(false)
  }

  const input = "w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sync</h2>
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3">
        {!sync.configured ? (
          <p className="text-sm text-muted-foreground">
            Cloud sync isn't set up yet. Add your Supabase URL and key to <code>.env.local</code> (see <code>.env.example</code>).
          </p>
        ) : sync.email ? (
          <>
            <div className="flex items-center gap-3">
              <Cloud size={18} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{sync.email}</p>
                <p className={`text-xs mt-0.5 ${sync.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                  {sync.status === "syncing" ? "Syncing…"
                    : sync.status === "error" ? `Sync failed: ${sync.error}`
                    : sync.lastSynced ? `Synced ${sync.lastSynced.toLocaleTimeString()}` : "Signed in"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void syncNow()}
                disabled={sync.status === "syncing"}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-foreground text-background disabled:opacity-50"
              >
                <RefreshCw size={15} className={sync.status === "syncing" ? "animate-spin" : ""} />
                Sync now
              </button>
              <button
                onClick={() => void signOut()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Sign in to back up your workouts and history and use them on any phone.
            </p>
            <input className={input} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={input} type="password" placeholder="Password (min 6 characters)" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {message && <p className="text-xs text-destructive">{message}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => submit("in")}
                disabled={busy || !email || !password}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-foreground text-background disabled:opacity-50"
              >
                Sign in
              </button>
              <button
                onClick={() => submit("up")}
                disabled={busy || !email || password.length < 6}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border disabled:opacity-50"
              >
                Create account
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [cleared, setCleared] = useState(false)

  async function handleClearHistory() {
    if (!confirm("Clear all workout history? This cannot be undone.")) return
    await clearAllRuns()
    setCleared(true)
  }

  return (
    <div className="pb-28">
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

        <AccountSection />

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
