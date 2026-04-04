import { Octokit } from "@octokit/rest";

import type { Env } from "@/env";
import type {
  RepoOwner,
  RepoOwnerType,
  RepoPatch,
  RepoSelection,
  RepoSnapshot,
  RepoVisibility
} from "@/contracts";
import { HttpError } from "@/lib/errors";
import { buildStarterSitePatch } from "@/lib/starter-site";
import { buildRepoConventions, slugify } from "@/lib/utils";

const TEXT_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".md", ".mjs", ".cjs"];

function makeOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

function splitRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new HttpError(400, "Repository must be formatted as owner/name.");
  }
  return { owner, repo };
}

function isTextFile(path: string): boolean {
  return TEXT_EXTENSIONS.some((extension) => path.endsWith(extension));
}

function prioritizePaths(path: string): number {
  const rules = ["app/", "src/", "components/", "pages/", "styles/", "package.json", "tailwind.config", "next.config"];
  const index = rules.findIndex((rule) => path.includes(rule));
  return index === -1 ? rules.length : index;
}

async function fetchViewer(octokit: Octokit) {
  const { data } = await octokit.users.getAuthenticated();
  return {
    id: String(data.id),
    login: data.login,
    avatarUrl: data.avatar_url,
    name: data.name || data.login
  };
}

export function createGitHubService(env: Env) {
  async function listOwners(token: string): Promise<RepoOwner[]> {
    const octokit = makeOctokit(token);
    const [viewer, orgsResponse] = await Promise.all([
      fetchViewer(octokit),
      octokit.orgs.listForAuthenticatedUser({ per_page: 100 }).catch(() => ({ data: [] as Array<{
        login: string;
        avatar_url?: string;
      }> }))
    ]);

    const owners = new Map<string, RepoOwner>();
    owners.set(viewer.login, {
      login: viewer.login,
      type: "user",
      avatarUrl: viewer.avatarUrl
    });

    for (const org of orgsResponse.data) {
      owners.set(org.login, {
        login: org.login,
        type: "organization",
        avatarUrl: org.avatar_url
      });
    }

    return [...owners.values()].sort((left, right) => left.login.localeCompare(right.login));
  }

  async function listRepos(token: string): Promise<RepoSelection[]> {
    const octokit = makeOctokit(token);
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: "updated"
    });

    return data.map((repo) => ({
      fullName: repo.full_name,
      repoName: repo.name,
      ownerLogin: repo.owner?.login || repo.full_name.split("/")[0],
      ownerType:
        repo.owner?.type?.toLowerCase() === "organization" ? "organization" : "user",
      ownerAvatarUrl: repo.owner?.avatar_url,
      branch: repo.default_branch,
      vercelUrl:
        repo.homepage && repo.homepage.includes("vercel.app") ? repo.homepage : undefined
    }));
  }

  async function fetchRepoSnapshot(token: string, fullName: string, branch: string): Promise<RepoSnapshot> {
    const octokit = makeOctokit(token);
    const { owner, repo } = splitRepo(fullName);
    const branchResponse = await octokit.repos.getBranch({
      owner,
      repo,
      branch
    });
    const headSha = branchResponse.data.commit.sha;
    const treeSha = branchResponse.data.commit.commit.tree.sha;

    const treeResponse = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: "true"
    });

    const candidateFiles = treeResponse.data.tree
      .filter((entry) => entry.type === "blob" && entry.path && isTextFile(entry.path) && (entry.size ?? 0) < 40_000)
      .sort((left, right) => prioritizePaths(left.path ?? "") - prioritizePaths(right.path ?? ""))
      .slice(0, 18);

    const files = await Promise.all(
      candidateFiles.map(async (entry) => {
        const blob = await octokit.git.getBlob({
          owner,
          repo,
          file_sha: entry.sha!
        });

        return {
          path: entry.path!,
          content: Buffer.from(blob.data.content, "base64").toString("utf8"),
          sha: entry.sha,
          size: entry.size ?? 0
        };
      })
    );

    const packageFile = files.find((file) => file.path.endsWith("package.json"));
    const dependencyMap = packageFile
      ? (JSON.parse(packageFile.content) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        })
      : undefined;
    const dependencies = [
      ...Object.keys(dependencyMap?.dependencies || {}),
      ...Object.keys(dependencyMap?.devDependencies || {})
    ];

    const snapshot: RepoSnapshot = {
      repo: fullName,
      branch,
      headSha,
      defaultBranch: branchResponse.data.name,
      dependencies,
      files,
      repoSummary: ""
    };

    snapshot.repoSummary = buildRepoConventions(snapshot);
    return snapshot;
  }

  async function applyPatch(
    octokit: Octokit,
    fullName: string,
    branch: string,
    patch: RepoPatch
  ): Promise<{ commitSha: string; commitUrl: string }> {
    const { owner, repo } = splitRepo(fullName);
    const ref = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    const latestCommitSha = ref.data.object.sha;
    const latestCommit = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: latestCommitSha
    });

    const tree = await octokit.git.createTree({
      owner,
      repo,
      base_tree: latestCommit.data.tree.sha,
      tree: patch.files.map((file) =>
        file.operation === "delete"
          ? {
              path: file.path,
              mode: "100644",
              sha: null,
              type: "blob"
            }
          : {
              path: file.path,
              mode: "100644",
              type: "blob",
              content: file.content
            }
      )
    });

    const commit = await octokit.git.createCommit({
      owner,
      repo,
      message: patch.commitMessage || `Vibex update ${slugify(branch)}`,
      tree: tree.data.sha,
      parents: [latestCommitSha],
      author: {
        email: env.VIBE_DEPLOY_COMMITTER_EMAIL,
        name: env.VIBE_DEPLOY_COMMITTER_NAME
      }
    });

    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.data.sha
    });

    return {
      commitSha: commit.data.sha,
      commitUrl: commit.data.html_url || `https://github.com/${fullName}/commit/${commit.data.sha}`
    };
  }

  async function renameBranchIfNeeded(
    octokit: Octokit,
    owner: string,
    repo: string,
    currentBranch: string,
    nextBranch: string
  ) {
    if (currentBranch === nextBranch) {
      return currentBranch;
    }

    try {
      await octokit.repos.renameBranch({
        owner,
        repo,
        branch: currentBranch,
        new_name: nextBranch
      });
      return nextBranch;
    } catch {
      return currentBranch;
    }
  }

  async function createRepo(
    token: string,
    args: {
      ownerLogin: string;
      ownerType: RepoOwnerType;
      repoName: string;
      description?: string;
      visibility?: RepoVisibility;
    }
  ): Promise<RepoSelection> {
    const octokit = makeOctokit(token);
    const viewer = await fetchViewer(octokit);
    const isPrivate = (args.visibility || "private") !== "public";
    const repoResponse =
      args.ownerType === "organization" && args.ownerLogin !== viewer.login
        ? await octokit.repos.createInOrg({
            org: args.ownerLogin,
            name: args.repoName,
            description: args.description,
            private: isPrivate,
            auto_init: true
          })
        : await octokit.repos.createForAuthenticatedUser({
            name: args.repoName,
            description: args.description,
            private: isPrivate,
            auto_init: true
          });

    const ownerLogin = repoResponse.data.owner?.login || args.ownerLogin;
    const ownerType =
      repoResponse.data.owner?.type?.toLowerCase() === "organization" ? "organization" : "user";
    const repoName = repoResponse.data.name;
    const fullName = repoResponse.data.full_name;
    const branch = await renameBranchIfNeeded(
      octokit,
      ownerLogin,
      repoName,
      repoResponse.data.default_branch || "main",
      "main"
    );

    await applyPatch(octokit, fullName, branch, buildStarterSitePatch(repoName));

    return {
      fullName,
      repoName,
      ownerLogin,
      ownerType,
      ownerAvatarUrl: repoResponse.data.owner?.avatar_url,
      branch,
      vercelUrl:
        repoResponse.data.homepage && repoResponse.data.homepage.includes("vercel.app")
          ? repoResponse.data.homepage
          : undefined
    };
  }

  async function commitPatch(
    token: string,
    fullName: string,
    branch: string,
    patch: RepoPatch
  ): Promise<{ commitSha: string; commitUrl: string }> {
    const octokit = makeOctokit(token);
    return applyPatch(octokit, fullName, branch, patch);
  }

  async function getDeployState(token: string, fullName: string, ref: string) {
    const octokit = makeOctokit(token);
    const { owner, repo } = splitRepo(fullName);
    const checks = await octokit.checks.listForRef({
      owner,
      repo,
      ref,
      per_page: 100
    });
    const combined = await octokit.repos.getCombinedStatusForRef({
      owner,
      repo,
      ref
    });

    const vercelCheck = checks.data.check_runs.find((check) =>
      check.name.toLowerCase().includes("vercel")
    );

    if (vercelCheck?.status !== "completed") {
      return {
        status: "deploying" as const,
        message: vercelCheck?.details_url ? "Vercel is building the site." : "Waiting for Vercel checks.",
        deployUrl: vercelCheck?.details_url
      };
    }

    if (vercelCheck?.conclusion === "success") {
      return {
        status: "live" as const,
        message: "The Vercel deployment is live.",
        deployUrl: vercelCheck.details_url
      };
    }

    if (vercelCheck && vercelCheck.conclusion) {
      return {
        status: "failed" as const,
        message: `Vercel reported ${vercelCheck.conclusion}.`,
        deployUrl: vercelCheck.details_url,
        errorCode: vercelCheck.conclusion
      };
    }

    if (combined.data.state === "failure") {
      return {
        status: "failed" as const,
        message: "GitHub checks reported a failure before Vercel completed.",
        errorCode: "github_checks_failed"
      };
    }

    return {
      status: "deploying" as const,
      message: "GitHub accepted the push. Waiting for deploy checks."
    };
  }

  return {
    createRepo,
    fetchRepoSnapshot,
    commitPatch,
    getDeployState,
    listOwners,
    listRepos
  };
}
