import { describe, expect, it } from "vitest";

import { createSkillService } from "@/lib/skills";

describe("skill composition", () => {
  it("merges default and request skills", async () => {
    const service = createSkillService({
      convex: {
        listSkills: async () => [],
        saveSkill: async () => undefined
      } as never
    });

    const result = await service.composeSkillBundle({
      repoSnapshot: {
        repo: "acme/demo-site",
        branch: "main",
        headSha: "abc",
        files: [
          {
            path: "app/page.tsx",
            content: "export default function Page() { return null; }",
            size: 44
          }
        ],
        dependencies: ["next", "tailwindcss"],
        repoSummary: "summary"
      },
      providedSkills: ["Use bold typography."],
      messages: []
    });

    expect(result.prompt).toContain("Repo conventions");
    expect(result.prompt).toContain("Use bold typography.");
    expect(result.prompt).toContain("tailwindcss");
  });
});
