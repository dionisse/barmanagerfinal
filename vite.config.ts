import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  strictPort: true,
  allowedHosts: true,
  hmr: { overlay: false },
  proxy: {
    "/api": { target: "http://localhost:3000", changeOrigin: true },
  },
},
});
