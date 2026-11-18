import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig as defineViteConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { defineConfig as defineLovableConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";

// Where the built app will run. Vercel sets VERCEL automatically, so a plain
// `bun run build` there produces the Vercel output. For any other host, set
// DEPLOY_TARGET=node (bun run build:node) to get a self-contained Node server.
const target = process.env.DEPLOY_TARGET ?? (isVercel ? "vercel" : "lovable");

const pluginsFor = (preset: "vercel" | "node") => [
  tailwindcss(),
  tsConfigPaths({ projects: ["./tsconfig.json"] }),
  tanstackStart({ server: { entry: "server" } }),
  nitro({ preset }),
  viteReact(),
];

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default
  target === "lovable"
    ? defineLovableConfig({
        tanstackStart: {
          server: { entry: "server" },
        },
      })
    : defineViteConfig({
        plugins: pluginsFor(target === "node" ? "node" : "vercel"),
      });
