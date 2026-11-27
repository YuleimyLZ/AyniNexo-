import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { validateConnection } from './src/services/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  validateConnection(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
  return {
    plugins: [react(), tailwindcss()],
    test: { include: ['tests/**/*.test.ts'] },
    build: { rollupOptions: { output: { manualChunks: { supabase: ['@supabase/supabase-js'] } } } },
  }
})
