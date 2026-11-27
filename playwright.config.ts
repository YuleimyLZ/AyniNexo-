import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  outputDir: 'test-results',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1040 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 393, height: 852 } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    env: { VITE_SUPABASE_URL: 'https://ayni-browser.example.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browserfixture' },
  },
})
