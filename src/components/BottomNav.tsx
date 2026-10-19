import { useRoute, Link } from "wouter"
import { Home, History, Settings } from "lucide-react"

export function BottomNav() {
  const [isRun] = useRoute("/run/:id")
  if (isRun) return null

  return (
    <nav
      className="fixed left-0 right-0 z-50 max-w-lg mx-auto px-4 pointer-events-none"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto bg-card border border-border rounded-full shadow-lg p-1.5 flex items-center gap-1">
        <NavItem href="/" icon={<Home size={22} />} label="Home" />
        <NavItem href="/history" icon={<History size={22} />} label="History" />
        <NavItem href="/settings" icon={<Settings size={22} />} label="Settings" />
      </div>
    </nav>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const [active] = useRoute(href === "/" ? "/" : `${href}*`)
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex-1 flex items-center justify-center py-3.5 rounded-full transition-colors ${
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
    </Link>
  )
}
