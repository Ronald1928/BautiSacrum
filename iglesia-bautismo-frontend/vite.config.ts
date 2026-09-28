import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  server: {
    host: true, // permite exponer en red
    allowedHosts: ["all"], // permite conexiones desde cualquier host
  },
});
