import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@supabase') || id.includes('@realtime') || id.includes('cross-fetch')) return 'vendor-supabase'
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id.replaceAll('\\', '/'))) return 'vendor-react'
          return undefined
        },
      },
    },
  },
})
