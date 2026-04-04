import { Redirect } from "expo-router";

import { useAppStore } from "@/store/app-store";

export default function ConnectionsRedirect() {
  const activeProjectId = useAppStore((state) => state.activeProjectId);

  if (activeProjectId) {
    return <Redirect href={`/projects/${activeProjectId}/settings`} />;
  }

  return <Redirect href="/projects" />;
}
