import * as WebBrowser from "expo-web-browser";

import type { HfSession } from "@/types";

const HF_OAUTH_BASE_URL = "https://huggingface.co/oauth";
const HF_WHOAMI_URL = "https://huggingface.co/api/whoami-v2";
const HF_SCOPE = "openid profile gated-repos";
const DEVICE_CODE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in?: number;
  interval?: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

function getHfClientId() {
  const clientId = process.env.EXPO_PUBLIC_HF_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("EXPO_PUBLIC_HF_OAUTH_CLIENT_ID is not configured.");
  }
  return clientId;
}

async function requestDeviceCode() {
  const body = new URLSearchParams({
    client_id: getHfClientId(),
    scope: HF_SCOPE
  });

  const response = await fetch(`${HF_OAUTH_BASE_URL}/device`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  if (!response.ok) {
    throw new Error(`Unable to start Hugging Face sign-in (${response.status}).`);
  }

  return (await response.json()) as DeviceCodeResponse;
}

async function exchangeDeviceCode(deviceCode: string) {
  const body = new URLSearchParams({
    grant_type: DEVICE_CODE_GRANT,
    device_code: deviceCode,
    client_id: getHfClientId()
  });

  const response = await fetch(`${HF_OAUTH_BASE_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const payload = (await response.json().catch(() => null)) as
    | (TokenResponse & {
        error?: string;
      })
    | null;

  if (!response.ok) {
    const error = payload?.error || `huggingface_token_${response.status}`;
    throw new Error(error);
  }

  return payload as TokenResponse;
}

async function fetchProfile(accessToken: string) {
  const response = await fetch(HF_WHOAMI_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return {};
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        name?: string;
        avatarUrl?: string;
        avatar?: string;
      }
    | null;

  return {
    handle: payload?.name,
    avatarUrl: payload?.avatarUrl || payload?.avatar
  };
}

export async function signInToHuggingFace() {
  const deviceCode = await requestDeviceCode();
  await WebBrowser.openBrowserAsync(deviceCode.verification_uri);

  const startedAt = Date.now();
  const expiresAt = startedAt + (deviceCode.expires_in || 600) * 1000;
  const intervalMs = Math.max(2, deviceCode.interval || 5) * 1000;

  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      const token = await exchangeDeviceCode(deviceCode.device_code);
      const profile = await fetchProfile(token.access_token);

      const session: HfSession = {
        accessToken: token.access_token,
        scope: token.scope || HF_SCOPE,
        expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
        userCode: deviceCode.user_code,
        handle: profile.handle,
        avatarUrl: profile.avatarUrl
      };

      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || "");
      if (message === "authorization_pending" || message === "slow_down") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Hugging Face authorization timed out.");
}
