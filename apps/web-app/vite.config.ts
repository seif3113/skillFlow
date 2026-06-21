import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const SERVER_URL = process.env.VITE_SERVER_URL ?? "http://localhost:3001"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact(), nitro()],
  server: {
    proxy: {
      // Forward better-auth callbacks/API — fixes state_mismatch by keeping
      // the browser on a single origin (the Vite dev server).
      "/api/auth": {
        target: SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
      // GraphQL endpoint
      "/graphql": {
        target: SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
      // All other REST API routes
      "/api": {
        target: SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

export default config
