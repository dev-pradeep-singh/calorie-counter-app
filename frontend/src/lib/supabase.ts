// Supabase is used for sign-in only. All data goes through the FastAPI backend (lib/api.ts).
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Supabase is not configured: set SUPABASE_URL and SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey, {
  auth: {
    flowType: 'pkce', // email confirmation links come back as ?code=…, exchanged automatically
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
