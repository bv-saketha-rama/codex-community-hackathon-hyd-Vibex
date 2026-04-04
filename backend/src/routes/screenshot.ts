import type { Hono } from "hono";
import { z } from "zod";

import type { Services } from "@/services";

const screenshotSchema = z.object({
  url: z.string().url()
});

export function registerScreenshotRoutes(app: Hono, services: Services) {
  app.post("/screenshot", async (c) => {
    const body = screenshotSchema.parse(await c.req.json());
    const imageBase64 = await services.screenshot.captureUrl(body.url);
    return c.json({ image_base64: imageBase64 });
  });
}
