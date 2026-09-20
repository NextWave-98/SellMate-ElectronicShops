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

  build: {
    // The app previously emitted ONE ~4.6 MB index-*.js. Every user downloaded
    // the charting, PDF, QR-scanning and printing code on first paint even if
    // they never opened those pages.
    //
    // This splits out heavy LEAF libraries only   packages nothing else in the
    // bundle imports back into. Interdependent packages (React, Radix, the form
    // stacks) are deliberately left in the main chunk, because splitting those
    // is what causes "Cannot access X before initialization" at runtime.
    //
    // Route-level React.lazy() is the bigger win and the natural next step;
    // it is a separate change because it alters render behaviour.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return

          // Charts   only used on dashboards and report pages
          if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/.test(id)) {
            return 'vendor-charts'
          }
          // PDF export   only used when a user actually exports
          if (/[\\/]node_modules[\\/](html2pdf\.js|jspdf|html2canvas)[\\/]/.test(id)) {
            return 'vendor-pdf'
          }
          // Barcode / QR scanning + thermal printing   POS and barcode pages only
          if (/[\\/]node_modules[\\/](html5-qrcode|qz-tray)[\\/]/.test(id)) {
            return 'vendor-scan'
          }
          // React core kept together on purpose (see note above)
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
  },
}))
