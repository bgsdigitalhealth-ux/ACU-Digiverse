import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    {
      name: "acu-server-env",
      config: ({ mode }) => {
        Object.assign(process.env, loadEnv(mode ?? "development", process.cwd(), ""));
      },
    },
    tanstackStart({
      server: { entry: "server" },
      serverFns: {
        base: "/serverFn",
        disableCsrfMiddlewareWarning: true,
      },
    }),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "entities/decode": fileURLToPath(new URL("./node_modules/entities/lib/decode.js", import.meta.url)),
      "entities/encode": fileURLToPath(new URL("./node_modules/entities/lib/encode.js", import.meta.url)),
      "entities/lib/decode.js": fileURLToPath(new URL("./node_modules/entities/lib/decode.js", import.meta.url)),
      "entities/lib/encode.js": fileURLToPath(new URL("./node_modules/entities/lib/encode.js", import.meta.url)),
      "entities": fileURLToPath(new URL("./node_modules/entities", import.meta.url)),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "@tanstack/react-query",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-dialog",
      "react-day-picker",
      "date-fns",
    ],
  },
});

