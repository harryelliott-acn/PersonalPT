import { useRoute, Link } from "wouter"
import { Home, History, Settings } from "lucide-react"

export function BottomNav() {
  const [isRun] = useRoute("/run/:id")
  if (isRun) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-16 safe-area-pb">
      <NavItem href="/" icon={<Home size={22} />} label="Home" />
      <NavItem href="/history" icon={<History size={22} />} label="History" />
      <NavItem href="/settings" icon={<Settings size={22} />} label="Settings" />
    </nav>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const [active] = useRoute(href === "/" ? "/" : `${href}*`)
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}
