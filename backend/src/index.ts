import { serve } from "@hono/node-server";

import { createApp } from "@/app";
import { loadEnv } from "@/env";

const env = loadEnv();
const app = createApp(env);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
    hostname: "0.0.0.0"
  },
  (info) => {
    console.log(`Vibex backend listening on http://0.0.0.0:${info.port}`);
  }
);
