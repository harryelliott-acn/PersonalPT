import { lazy, Suspense } from "react"
import { Switch, Route, Redirect, useRoute } from "wouter"
import { BottomNav } from "./components/BottomNav"
import { HomePage } from "./pages/HomePage"
import { LoadingScreen } from "./components/LoadingScreen"

// Everything except the home screen loads on demand. RunPage is the big one:
// it pulls in three.js for the gradient, which the other screens never need.
const EditWorkoutPage = lazy(() => import("./pages/EditWorkoutPage").then((m) => ({ default: m.EditWorkoutPage })))
const loadRunPage = () => import("./pages/RunPage").then((m) => ({ default: m.RunPage }))
const RunPage = lazy(loadRunPage)

// Fetch the workout screen in the background once the home screen is idle, so Start feels instant.
const whenIdle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000))
whenIdle(() => { void loadRunPage() })
const HistoryPage = lazy(() => import("./pages/HistoryPage").then((m) => ({ default: m.HistoryPage })))
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })))

// Shown while a lazy page downloads: the workout screen gets a gradient loading screen straight away.
function RouteFallback() {
  const [isRun] = useRoute("/run/:id")
  return isRun ? <LoadingScreen /> : null
}

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground max-w-lg mx-auto relative">
      <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/create" component={EditWorkoutPage} />
        <Route path="/edit/:id" component={EditWorkoutPage} />
        <Route path="/run/:id" component={RunPage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
      </Suspense>
      <BottomNav />
    </div>
  )
}
