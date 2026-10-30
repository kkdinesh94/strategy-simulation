import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Heavy third-party libraries in their own long-cached chunks.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;
            const pkg = id.replace(/\\/g, "/").split("/node_modules/").pop()!.split("/")[0];
            if (["react", "react-dom", "scheduler"].includes(pkg)) return "react";
            if (pkg === "xlsx") return "spreadsheet";
            if (pkg === "three") return "three";
            if (["react-simple-maps", "d3-geo", "topojson-client", "world-atlas"].includes(pkg)) return "maps";
            if (pkg === "recharts" || pkg.startsWith("d3-") || ["victory-vendor", "es-toolkit", "decimal.js-light", "@reduxjs", "redux", "reselect", "immer"].includes(pkg)) return "charts";
            return undefined;
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
