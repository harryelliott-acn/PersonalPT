import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "next-themes"
import "./index.css"
import App from "./App"
import { getDB } from "./lib/db"

// Initialise DB (seeds presets if first launch) before rendering
getDB().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </ThemeProvider>
    </StrictMode>
  )
})
