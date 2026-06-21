import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "https://skill-flow-api.vercel.app"

// Use the Vercel Nitro preset in CI/production so the build outputs to
// .vercel/output/ (Vercel Build Output API). Locally keep the default.
const isVercel = !!process.env.VERCEL

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
      // When running on Vercel, emit serverless functions to .vercel/output/
      server: { preset: isVercel ? "vercel" : undefined },
    }),
    viteReact(),
    nitro(),
  ],
  server: {
    proxy: {
      // Forward better-auth callbacks/API — fixes state_mismatch by keeping
      // the browser on a single origin (the Vite dev server).
      "/api/auth": {
        target: SERVER_URL,
        changeOrigin: true,
        secure: true,
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
