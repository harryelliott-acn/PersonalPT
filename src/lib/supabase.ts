import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null when env vars aren't set — the app then runs local-only as before. */
export const supabase = url && anonKey ? createClient(url, anonKey) : null
