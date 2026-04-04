import { httpRouter } from "convex/server";

import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

type OAuthState = {
  redirectUri: string;
  userId?: string;
};

const DEFAULT_GOOGLE_SCOPES =
  "openid profile email https://www.googleapis.com/auth/cloud-platform.read-only";

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function encodeState(payload: OAuthState) {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeState(value: string | null): OAuthState | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as OAuthState;
  } catch {
    return null;
  }
}

function safeRedirectUri(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function redirectWithParams(redirectUri: string, params: Record<string, string>) {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return Response.redirect(url.toString(), 302);
}

function htmlPage(title: string, body: string) {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        background: #04070c;
        color: #f3f7ff;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at top, rgba(79, 172, 255, 0.22), transparent 36%),
          linear-gradient(180deg, #06101c 0%, #04070c 100%);
      }

      main {
        width: min(560px, 100%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 24px;
        padding: 28px;
        background: rgba(6, 16, 28, 0.88);
        box-shadow: 0 20px 80px rgba(0, 0, 0, 0.35);
      }

      h1 {
        margin: 0 0 12px;
        font-size: 28px;
      }

      p {
        margin: 0;
        line-height: 1.6;
        color: rgba(243, 247, 255, 0.82);
      }

      code {
        font-family: "SFMono-Regular", Consolas, monospace;
        color: #9ed0ff;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
    </main>
  </body>
</html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    }
  );
}

async function exchangeGitHubCode(code: string, redirectUri: string) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: getRequiredEnv("GITHUB_CLIENT_ID"),
      client_secret: getRequiredEnv("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri
    })
  });

  const payload = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!payload.access_token) {
    throw new Error(payload.error_description || "GitHub token exchange failed.");
  }

  return payload.access_token;
}

async function fetchGitHubViewer(token: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Vibex"
    }
  });

  if (!response.ok) {
    throw new Error("GitHub profile lookup failed.");
  }

  const payload = (await response.json()) as {
    id: number;
    login: string;
    avatar_url?: string;
    name?: string | null;
  };

  return {
    id: String(payload.id),
    login: payload.login,
    avatarUrl: payload.avatar_url,
    name: payload.name || payload.login
  };
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });

  const payload = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!payload.access_token) {
    throw new Error(payload.error_description || "Google token exchange failed.");
  }

  return payload.access_token;
}

const http = httpRouter();

http.route({
  path: "/",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("Vibex Convex auth endpoints are live.", {
      status: 200,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  })
});

http.route({
  path: "/.well-known/oauth-cimd",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const clientId = `${url.origin}/.well-known/oauth-cimd`;

    return new Response(
      JSON.stringify({
        client_id: clientId,
        client_name: "Vibex",
        redirect_uris: [`${url.origin}/auth/huggingface/callback`],
        token_endpoint_auth_method: "none",
        client_uri: url.origin
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300"
        }
      }
    );
  })
});

http.route({
  path: "/auth/huggingface/callback",
  method: "GET",
  handler: httpAction(async () => {
    return htmlPage(
      "Hugging Face Connected",
      "This callback is published for Vibex OAuth metadata. You can close this page and return to the app."
    );
  })
});

http.route({
  path: "/auth/github",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const redirectUri = safeRedirectUri(url.searchParams.get("redirectUri"));

    if (!redirectUri) {
      return jsonError(400, "A valid redirectUri is required.");
    }

    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      return jsonError(500, "GitHub OAuth is not configured in Convex env.");
    }

    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
    authorizeUrl.searchParams.set("scope", "repo read:user read:org admin:org");
    authorizeUrl.searchParams.set("redirect_uri", `${url.origin}/auth/github/callback`);
    authorizeUrl.searchParams.set("state", encodeState({ redirectUri }));

    return Response.redirect(authorizeUrl.toString(), 302);
  })
});

http.route({
  path: "/auth/github/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const state = decodeState(url.searchParams.get("state"));
    const redirectUri = state?.redirectUri;

    if (!redirectUri) {
      return jsonError(400, "Missing or invalid OAuth state.");
    }

    const providerError = url.searchParams.get("error");
    if (providerError) {
      return redirectWithParams(redirectUri, {
        provider: "github",
        error: providerError
      });
    }

    const code = url.searchParams.get("code");
    if (!code) {
      return redirectWithParams(redirectUri, {
        provider: "github",
        error: "missing_code"
      });
    }

    try {
      const callbackUrl = `${url.origin}/auth/github/callback`;
      const token = await exchangeGitHubCode(code, callbackUrl);
      const user = await fetchGitHubViewer(token);

      await ctx.runMutation(api.users.upsertByGithub, {
        userId: user.id,
        githubToken: token,
        login: user.login,
        avatarUrl: user.avatarUrl,
        name: user.name
      });

      return redirectWithParams(redirectUri, {
        provider: "github",
        token,
        userId: user.id,
        login: user.login,
        avatarUrl: user.avatarUrl || "",
        name: user.name || ""
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub auth failed.";
      return redirectWithParams(redirectUri, {
        provider: "github",
        error: message
      });
    }
  })
});

http.route({
  path: "/auth/stitch",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const redirectUri = safeRedirectUri(url.searchParams.get("redirectUri"));
    const userId = url.searchParams.get("userId") || undefined;

    if (!redirectUri) {
      return jsonError(400, "A valid redirectUri is required.");
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return jsonError(500, "Google OAuth is not configured in Convex env.");
    }

    const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizeUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", `${url.origin}/auth/stitch/callback`);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", process.env.GOOGLE_SCOPES || DEFAULT_GOOGLE_SCOPES);
    authorizeUrl.searchParams.set("access_type", "offline");
    authorizeUrl.searchParams.set("prompt", "consent");
    authorizeUrl.searchParams.set("state", encodeState({ redirectUri, userId }));

    return Response.redirect(authorizeUrl.toString(), 302);
  })
});

http.route({
  path: "/auth/stitch/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const state = decodeState(url.searchParams.get("state"));
    const redirectUri = state?.redirectUri;

    if (!redirectUri) {
      return jsonError(400, "Missing or invalid OAuth state.");
    }

    const providerError = url.searchParams.get("error");
    if (providerError) {
      return redirectWithParams(redirectUri, {
        provider: "stitch",
        error: providerError
      });
    }

    const code = url.searchParams.get("code");
    if (!code) {
      return redirectWithParams(redirectUri, {
        provider: "stitch",
        error: "missing_code"
      });
    }

    try {
      const callbackUrl = `${url.origin}/auth/stitch/callback`;
      const stitchToken = await exchangeGoogleCode(code, callbackUrl);

      if (state?.userId) {
        await ctx.runMutation(api.users.setStitchConnection, {
          userId: state.userId,
          stitchToken
        });
      }

      return redirectWithParams(redirectUri, {
        provider: "stitch",
        stitchToken
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google auth failed.";
      return redirectWithParams(redirectUri, {
        provider: "stitch",
        error: message
      });
    }
  })
});

export default http;
