import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { getApiBaseUrl } from "@/lib/api";
import type { SessionUser } from "@/types";

WebBrowser.maybeCompleteAuthSession();

const scheme = process.env.EXPO_PUBLIC_APP_SCHEME || "vibex";
const authBaseUrl = process.env.EXPO_PUBLIC_AUTH_URL || getApiBaseUrl();

function getRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme,
    path: "auth"
  });
}

function parseResultUrl(url: string) {
  const params = new URL(url).searchParams;
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function connectGitHub(): Promise<SessionUser | null> {
  const redirectUri = getRedirectUri();
  const authUrl = `${authBaseUrl}/auth/github?redirectUri=${encodeURIComponent(redirectUri)}`;
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type === "cancel") {
    throw new Error("GitHub sign-in was cancelled.");
  }

  if (result.type !== "success" || !result.url) {
    return null;
  }

  const params = parseResultUrl(result.url);
  if (params.error) {
    throw new Error(String(params.error));
  }
  return {
    userId: String(params.userId),
    githubToken: String(params.token),
    login: String(params.login),
    avatarUrl: params.avatarUrl ? String(params.avatarUrl) : undefined,
    name: params.name ? String(params.name) : undefined
  };
}
