import puppeteer from "puppeteer";

import { HttpError } from "@/lib/errors";

export function createScreenshotService() {
  async function captureUrl(url: string): Promise<string> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 1024, deviceScaleFactor: 1 });
      await page.goto(url, { waitUntil: "networkidle2", timeout: 45_000 });
      const screenshot = await page.screenshot({ type: "png", fullPage: true });
      return Buffer.from(screenshot).toString("base64");
    } catch (error) {
      throw new HttpError(400, `Unable to capture ${url}.`, {
        message: error instanceof Error ? error.message : "Screenshot failed"
      });
    } finally {
      await browser?.close();
    }
  }

  return { captureUrl };
}
