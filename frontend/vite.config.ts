import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig(({ command, mode }) => {
  // Reuse the backend's settings: Vercel provides them at build time, and locally
  // they come from the repo-root .env. Only these two public values reach the bundle.
  const env = { ...loadEnv(mode, repoRoot, ''), ...process.env }
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''

  if (command === 'build' && (!supabaseUrl.trim() || !supabaseAnonKey.trim())) {
    // Without these the app can't start; fail loudly instead of shipping a blank page.
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set to build the frontend (repo-root .env or Vercel env)')
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl.trim()),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey.trim()),
    },
    server: {
      port: 5173,
      proxy: { '/api': 'http://localhost:8000' },
    },
  }
})
