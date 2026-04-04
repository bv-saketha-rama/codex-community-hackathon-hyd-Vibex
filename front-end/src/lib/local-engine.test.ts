import { describe, expect, it } from "vitest";

import { generateConversationLocally, generatePatchLocally } from "@/lib/local-engine";

const repoSnapshot = {
  repo: "owner/repo",
  branch: "main",
  headSha: "head_sha",
  dependencies: ["expo", "react-native"],
  repoSummary: "Repo: owner/repo",
  files: [
    {
      path: "README.md",
      content: "# Vibex\n",
      size: 8
    },
    {
      path: "app/index.tsx",
      content: "export default function Home() { return null; }\n",
      size: 48
    }
  ]
};

describe("local engine heuristics", () => {
  it("creates a clarification reply and local spec", () => {
    const result = generateConversationLocally({
      input: "Refresh the hero copy and keep the rest of the brand intact.",
      messages: [],
      followUpCount: 0,
      repoSnapshot,
      skillPrompt: "Prefer existing components."
    });

    expect(result.readyToConfirm).toBe(false);
    expect(result.spec.summary).toContain("Refresh the hero copy");
    expect(result.spec.targetPaths).toContain("README.md");
  });

  it("creates a safe local patch candidate", () => {
    const patch = generatePatchLocally({
      spec: {
        summary: "Refresh the hero copy and CTA.",
        goals: ["Refresh the hero copy and CTA."],
        constraints: [],
        acceptanceCriteria: [],
        targetPaths: ["README.md"],
        designNotes: []
      },
      repoSnapshot,
      skillPrompt: "Prefer existing components."
    });

    expect(patch.commitMessage).toBe("feat: apply on-device Vibex update");
    expect(patch.files[0]?.path).toBe("README.md");
    expect(patch.files[0]?.content).toContain("Vibex Local Change");
  });
});
