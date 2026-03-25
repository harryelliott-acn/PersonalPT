import express from "express"

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(express.json())

// Future: cloud sync routes will be added here.
// Requires DATABASE_URL env var for PostgreSQL via Drizzle ORM.

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`PersonalPT server running on http://localhost:${PORT}`)
})
