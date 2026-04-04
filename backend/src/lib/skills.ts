import type { createConvexService } from "@/lib/convex";
import type { ConversationMessage, RepoSnapshot, SkillRecord } from "@/contracts";
import { buildRepoConventions } from "@/lib/utils";

type ConvexService = ReturnType<typeof createConvexService>;

export function createSkillService(deps: { convex: ConvexService }) {
  async function composeSkillBundle(args: {
    userId?: string;
    projectId?: string;
    repoSnapshot: RepoSnapshot;
    providedSkills?: string[];
    messages: ConversationMessage[];
  }) {
    const persistedSkills = args.userId ? await deps.convex.listSkills(args.userId) : [];
    const persistedMcps = args.userId ? await deps.convex.listMcps(args.userId) : [];
    const agentDoc =
      args.projectId && args.userId ? await deps.convex.getAgentDoc(args.projectId) : undefined;
    const repoConventions = buildRepoConventions(args.repoSnapshot);

    const activeSkills = persistedSkills.filter(
      (skill: SkillRecord) =>
        skill.enabled &&
        (skill.scope === "user" || (args.projectId ? skill.projectId === args.projectId : false))
    );

    const activeMcps = persistedMcps.filter(
      (mcp) => mcp.enabled && (!mcp.projectId || mcp.projectId === args.projectId)
    );

    const defaultSections = [
      {
        name: "Repo conventions",
        content: repoConventions
      },
      {
        name: "Recent conversation",
        content:
          args.messages
            .slice(-6)
            .map((message) => `${message.role}: ${message.content}`)
            .join("\n") || "No prior messages in this chat."
      },
      {
        name: "Dependency context",
        content: `Dependencies detected in package.json: ${
          args.repoSnapshot.dependencies.join(", ") || "none detected"
        }`
      }
    ];

    const sections = [
      ...defaultSections.map((section) => `## ${section.name}\n${section.content}`),
      ...activeSkills.map((skill) => `## Skill: ${skill.name}\n${skill.content}`),
      ...activeMcps.map((mcp) =>
        [
          `## MCP: ${mcp.name}`,
          mcp.description ? `Description: ${mcp.description}` : undefined,
          mcp.serverUrl ? `Server URL: ${mcp.serverUrl}` : undefined,
          mcp.command ? `Command: ${mcp.command}` : undefined,
          mcp.instructions
        ]
          .filter(Boolean)
          .join("\n")
      ),
      ...(agentDoc?.enabled ? [`## agents.md\n${agentDoc.content}`] : []),
      ...(args.providedSkills || []).map((skill, index) => `## Request skill ${index + 1}\n${skill}`)
    ];

    return {
      prompt: sections.filter(Boolean).join("\n\n")
    };
  }

  return { composeSkillBundle };
}
