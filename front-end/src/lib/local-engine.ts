import type {
  ConversationMessage,
  ConversationReply,
  ConversationSpec,
  RepoPatch,
  RepoSnapshot
} from "@/types";

function createFallbackSpec(input: string, repoSnapshot: RepoSnapshot): ConversationSpec {
  return {
    summary: input,
    goals: [input],
    constraints: [
      "Preserve existing repo conventions",
      "Generate locally on device before pushing to GitHub"
    ],
    acceptanceCriteria: [
      "Requested change is reflected in the repo patch",
      "Changes stay scoped to relevant files only"
    ],
    targetPaths: repoSnapshot.files.slice(0, 4).map((file) => file.path),
    designNotes: []
  };
}

function inferReply(input: string, followUpCount: number) {
  const normalized = input.toLowerCase();
  const readyToConfirm = /(yes|ship|deploy|go ahead|confirm)/.test(normalized) || followUpCount >= 2;

  return readyToConfirm
    ? "I have enough context from the local repo snapshot. The patch is ready to generate on this device."
    : "I can work with that. Should this stay scoped to the current surface only, and should I preserve the existing brand direction unless you asked to change it?";
}

function createSafePatchTarget(spec: ConversationSpec, repoSnapshot: RepoSnapshot) {
  const preferredPath =
    spec.targetPaths.find((path) => repoSnapshot.files.some((file) => file.path === path)) ||
    repoSnapshot.files.find((file) => file.path.endsWith(".md"))?.path ||
    repoSnapshot.files.find((file) => file.path.endsWith(".tsx") || file.path.endsWith(".ts"))?.path;

  const existing = preferredPath
    ? repoSnapshot.files.find((file) => file.path === preferredPath)
    : undefined;

  if (!existing) {
    return {
      path: ".vibex/local-change.md",
      content: `# Vibex Local Change\n\n${spec.summary}\n`,
      reason: "Local on-device patch summary"
    };
  }

  if (existing.path.endsWith(".md")) {
    return {
      path: existing.path,
      content: `${existing.content}\n\n## Vibex Local Change\n\n${spec.summary}\n`,
      reason: "Append a safe markdown summary generated on device"
    };
  }

  return {
    path: existing.path,
    content: `${existing.content}\n\n// Vibex local patch note: ${spec.summary}\n`,
    reason: "Append a safe on-device marker to demonstrate local patch execution"
  };
}

export function generateConversationLocally(args: {
  input: string;
  messages: ConversationMessage[];
  followUpCount: number;
  repoSnapshot: RepoSnapshot;
  skillPrompt: string;
}) {
  const spec = createFallbackSpec(args.input, args.repoSnapshot);
  const reply = inferReply(args.input, args.followUpCount);

  const result: ConversationReply = {
    reply,
    readyToConfirm: reply.includes("ready to generate"),
    followUpCount: reply.includes("ready to generate")
      ? args.followUpCount
      : args.followUpCount + 1,
    spec: {
      ...spec,
      constraints: [...spec.constraints, args.skillPrompt].filter(Boolean)
    }
  };

  return result;
}

export function generatePatchLocally(args: {
  spec: ConversationSpec;
  repoSnapshot: RepoSnapshot;
  skillPrompt: string;
}) {
  const target = createSafePatchTarget(args.spec, args.repoSnapshot);
  const patch: RepoPatch = {
    commitMessage: "feat: apply on-device Vibex update",
    summary: args.spec.summary,
    files: [
      {
        path: target.path,
        content: target.content,
        operation: "upsert",
        reason: `${target.reason}. ${args.skillPrompt}`.trim()
      }
    ]
  };

  return patch;
}

export function transcribeAudioLocally(audioBase64: string) {
  const sizeHint = Math.max(1, Math.round(audioBase64.length / 1024));
  return `Voice request captured locally (${sizeHint} KB audio attachment).`;
}
