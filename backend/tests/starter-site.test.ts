import { describe, expect, it } from "vitest";

import { buildStarterSitePatch } from "@/lib/starter-site";

describe("buildStarterSitePatch", () => {
  it("creates a Next.js starter scaffold", () => {
    const patch = buildStarterSitePatch("demo-site");
    const paths = patch.files.map((file) => file.path);

    expect(patch.commitMessage).toBe("Initialize Vibex starter site");
    expect(paths).toContain("package.json");
    expect(paths).toContain("app/layout.tsx");
    expect(paths).toContain("app/page.tsx");
    expect(paths).toContain("app/globals.css");
    expect(paths).toContain("tailwind.config.ts");
  });
});
