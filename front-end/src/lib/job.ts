import type { JobRecord, JobStatus } from "@/types";

export function statusLabel(status: JobStatus) {
  switch (status) {
    case "queued":
      return "Queued";
    case "generating":
      return "Generating diff";
    case "pushing":
      return "Pushing to GitHub";
    case "deploying":
      return "Deployment running";
    case "live":
      return "Live";
    case "failed":
      return "Failed";
    case "ready":
      return "Ready";
    case "clarifying":
      return "Clarifying";
    case "drafting":
    default:
      return "Drafting";
  }
}

export function nextStatusCopy(job?: JobRecord) {
  if (!job) {
    return "Ready for your first request.";
  }

  const label = statusLabel(job.status);
  return `${label} | ${job.message}`;
}
