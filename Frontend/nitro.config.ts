import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  handlers: [
    {
      route: "/**",
      handler: "./dist/server/server.js",
    },
  ],
  publicAssets: [
    {
      baseURL: "/",
      dir: "./dist/client",
    },
  ],
});

