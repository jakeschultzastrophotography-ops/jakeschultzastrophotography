import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          framer: ["framer-motion"],
          icons: ["lucide-react"],
          maps: ["leaflet", "react-leaflet"],
          astro: ["astronomy-engine"]
        }
      }
    }
  }
});