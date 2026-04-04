import { useEffect } from "react";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { LoadingScreen } from "@/components/loading-screen";
import { useAppStore } from "@/store/app-store";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default function AuthCallbackRoute() {
  const params = useLocalSearchParams();
  const setSession = useAppStore((state) => state.setSession);

  useEffect(() => {
    const provider = firstParam(params.provider);
    const error = firstParam(params.error);

    if (!provider) {
      router.replace("/onboarding");
      return;
    }

    if (error) {
      Alert.alert("Authentication failed", decodeURIComponent(error));
      router.replace("/onboarding");
      return;
    }

    if (provider === "github") {
      const userId = firstParam(params.userId);
      const githubToken = firstParam(params.token);
      const login = firstParam(params.login);

      if (!userId || !githubToken || !login) {
        Alert.alert("Authentication failed", "GitHub did not return a complete session.");
        router.replace("/onboarding");
        return;
      }

      setSession({
        userId,
        githubToken,
        login,
        avatarUrl: firstParam(params.avatarUrl) || undefined,
        name: firstParam(params.name) || undefined
      });
      router.replace("/onboarding?step=repo");
      return;
    }

    router.replace("/onboarding");
  }, [params, setSession]);

  return <LoadingScreen />;
}
