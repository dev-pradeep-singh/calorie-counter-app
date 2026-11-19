// Supabase is used for sign-in only, so we load just its auth client instead of all of
// supabase-js. All data goes through the FastAPI backend (lib/api.ts).
import { AuthClient } from '@supabase/auth-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = {
  auth: new AuthClient({
    url: `${url}/auth/v1`,
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    // Same key supabase-js uses, so sessions from the old page (and other tabs) carry over.
    storageKey: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
    flowType: 'pkce', // email confirmation links come back as ?code=…, exchanged automatically
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }),
}
