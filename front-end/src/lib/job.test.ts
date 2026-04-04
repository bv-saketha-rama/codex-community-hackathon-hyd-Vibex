import { describe, expect, it } from "vitest";

import { nextStatusCopy, statusLabel } from "@/lib/job";

describe("job helpers", () => {
  it("formats status labels", () => {
    expect(statusLabel("deploying")).toBe("Deployment running");
    expect(statusLabel("live")).toBe("Live");
  });

  it("builds friendly fallback copy", () => {
    expect(nextStatusCopy()).toBe("Ready for your first request.");
    expect(
      nextStatusCopy({
        status: "pushing",
        message: "Syncing changes to GitHub."
      })
    ).toContain("Pushing to GitHub");
  });
});
