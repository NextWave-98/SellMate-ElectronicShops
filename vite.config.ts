import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Strip console.* and debugger statements from PRODUCTION builds only.
  // Dev (`vite dev`) keeps them for debugging.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : undefined,
}))
