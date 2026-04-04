import type { Env } from "@/env";
import type { StitchDesignContext, StitchProject } from "@/contracts";
import { HttpError } from "@/lib/errors";

export function createStitchService(env: Env) {
  async function listProjects(token: string): Promise<StitchProject[]> {
    if (!env.STITCH_PROJECT_ENDPOINT) {
      return [];
    }

    const response = await fetch(env.STITCH_PROJECT_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new HttpError(400, "Unable to list Stitch projects.");
    }

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    return payload.map((project) => ({
      id: String(project.id),
      name: String(project.name || project.title || project.id),
      description: project.description ? String(project.description) : undefined
    }));
  }

  async function getDesignContext(
    token: string,
    projectId?: string
  ): Promise<StitchDesignContext | undefined> {
    if (!projectId || !env.STITCH_PROJECT_ENDPOINT) {
      return undefined;
    }

    const response = await fetch(`${env.STITCH_PROJECT_ENDPOINT}/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const tokens = JSON.stringify(payload.tokens || payload.design || payload, null, 2);

    return {
      projectId,
      projectName: String(payload.name || projectId),
      prompt: `Stitch design tokens for ${String(payload.name || projectId)}:\n${tokens}`
    };
  }

  return { getDesignContext, listProjects };
}
