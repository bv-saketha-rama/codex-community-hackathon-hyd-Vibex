import { Redirect } from "expo-router";

import { useAppStore } from "@/store/app-store";

export default function IndexRoute() {
  const session = useAppStore((state) => state.session);
  const activeProjectId = useAppStore((state) => state.activeProjectId);

  if (!session) {
    return <Redirect href="/onboarding" />;
  }

  if (!activeProjectId) {
    return <Redirect href={`/onboarding?step=${session.openaiApiKey ? "repo" : "openai"}`} />;
  }

  return <Redirect href={`/projects/${activeProjectId}`} />;

}
