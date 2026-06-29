import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: 5173,
      allowedHosts: true,
      proxy: {
        '/api/usuarios': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/usuarios/, '')
        },
        '/api/expedientes': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/expedientes/, '')
        },
        '/api/mantenedores': {
          target: 'http://localhost:3003',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/mantenedores/, '')
        },
        '/api/tareas': {
          target: 'http://localhost:3004',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tareas/, '')
        }
      }
    },
    base: env.BASE_URL || '/',
    build: {
      assetsDir: 'assets',
      sourcemap: false
    }
  }
})