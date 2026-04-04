import type {
  ConversationMessage,
  ConversationSpec,
  InputMode,
  RepoSnapshot
} from "@/contracts";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function parseJson<T>(value: string): T {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("Model did not return JSON.");
  }

  return JSON.parse(value.slice(start, end + 1)) as T;
}

export function countClarificationReplies(messages: ConversationMessage[]): number {
  return messages.filter((message) => message.role === "assistant").length;
}

export function buildRepoConventions(snapshot: RepoSnapshot): string {
  const deps = snapshot.dependencies.slice(0, 12).join(", ") || "No dependencies detected";
  const usesAppRouter = snapshot.files.some((file) => file.path.includes("app/"));
  const usesTailwind = snapshot.dependencies.some((dep) => dep.includes("tailwind"));
  const usesShadcn = snapshot.files.some((file) => file.path.includes("components/ui/"));

  return [
    `Repo: ${snapshot.repo}`,
    `Branch: ${snapshot.branch}`,
    `Routing style: ${usesAppRouter ? "app-style routing" : "non-app routing"}`,
    `Styling: ${usesTailwind ? "Tailwind-driven" : "custom styling"}`,
    `Component library: ${usesShadcn ? "shadcn-style ui components present" : "custom components"}`,
    `Top dependencies: ${deps}`
  ].join("\n");
}

export function createEmptySpec(input: string): ConversationSpec {
  return {
    summary: input || "Awaiting a concrete request.",
    goals: input ? [input] : [],
    constraints: [],
    acceptanceCriteria: [],
    targetPaths: [],
    designNotes: []
  };
}

export function createConversationTitle(input: string): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "New chat";
  }

  return compact.length > 42 ? `${compact.slice(0, 39).trimEnd()}...` : compact;
}

export function inferInputType(
  audioBase64?: string,
  imageBase64?: string,
  text?: string
): InputMode {
  if (audioBase64) {
    return "voice";
  }
  if (imageBase64) {
    return "image";
  }
  if (text?.startsWith("http://") || text?.startsWith("https://")) {
    return "url";
  }
  return "text";
}
