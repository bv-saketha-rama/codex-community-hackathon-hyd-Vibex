import type { Env } from "@/env";
import type { MarketplaceSkill } from "@/contracts";

const fallbackSkills: MarketplaceSkill[] = [
  {
    id: "tailwind-v4",
    name: "Tailwind v4 rules",
    description: "Prefer utilities, fluid spacing, and token-driven color usage.",
    author: "Vibex",
    content:
      "Use Tailwind v4 utility classes first. Keep spacing consistent, prefer semantic color tokens, and preserve responsive balance."
  },
  {
    id: "shadcn-ui",
    name: "shadcn/ui conventions",
    description: "Prefer project UI primitives over raw HTML controls.",
    author: "Vibex",
    content:
      "Use existing shadcn/ui components where possible. Avoid raw buttons or inputs when a project-level primitive already exists."
  },
  {
    id: "a11y",
    name: "Accessibility guardrails",
    description: "Preserve keyboard support, labels, and contrast.",
    author: "Vibex",
    content:
      "Maintain semantic structure, visible focus states, keyboard support, and color contrast when editing the UI."
  }
];

export function createMarketplaceService(env: Env) {
  async function list(): Promise<MarketplaceSkill[]> {
    try {
      const response = await fetch(env.SMITHERY_REGISTRY_URL, {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        return fallbackSkills;
      }

      const payload = (await response.json()) as Array<Record<string, unknown>>;
      return payload.slice(0, 12).map((item, index) => ({
        id: String(item.id || item.slug || `smithery-${index}`),
        name: String(item.name || item.title || "Unnamed skill"),
        description: String(item.description || "Imported from Smithery."),
        author: String(item.author || item.publisher || "Smithery"),
        content: String(item.instructions || item.prompt || item.description || "")
      }));
    } catch {
      return fallbackSkills;
    }
  }

  return { list };
}
