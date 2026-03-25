import { Switch, Route, Redirect } from "wouter"
import { BottomNav } from "./components/BottomNav"
import { HomePage } from "./pages/HomePage"
import { EditWorkoutPage } from "./pages/EditWorkoutPage"
import { RunPage } from "./pages/RunPage"
import { HistoryPage } from "./pages/HistoryPage"
import { SettingsPage } from "./pages/SettingsPage"

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground max-w-lg mx-auto relative">
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
      <BottomNav />
    </div>
  )
}
