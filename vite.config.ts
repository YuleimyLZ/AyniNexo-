import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { validateConnection } from './src/services/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  validateConnection(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
  return {
    plugins: [react(), tailwindcss()],
    build: { rollupOptions: { output: { manualChunks: { supabase: ['@supabase/supabase-js'] } } } },
  }
})
