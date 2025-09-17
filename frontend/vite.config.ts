import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import proxyOptions from "./proxyOptions";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/webapp/",
  server: {
    port: 8080,
    proxy: proxyOptions,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../recruitment/public/webapp"),
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: "[name].[ext]",
        // Vendor chunking configuration for better caching and optimization
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-mantine': ['@mantine/core', '@mantine/dates', '@mantine/hooks'],
          'vendor-utils': ['axios', 'date-fns', 'tailwind-merge'],
          'vendor-charts': ['@xyflow/react', 'react-organizational-chart'],
          'vendor-pdf': ['react-pdf']
        }
      },
      // Aggressive tree shaking configuration
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    },
    emptyOutDir: true,
    target: "es2015",
    // Set chunk size warning limit to 500KB
    chunkSizeWarningLimit: 500,
  },
});
