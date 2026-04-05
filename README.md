# Vibex

Vibex is a mobile-first workspace for shipping GitHub repo changes from an Android phone.

This branch removes the old OpenAI backend flow and replaces it with an Android on-device model path:

- GitHub auth and realtime job state still live in Convex
- the backend still handles repo snapshotting, URL screenshots, GitHub commits, and deploy polling
- clarification and patch generation now happen locally on the phone
- a local Gemma 4 LiteRT model artifact is downloaded to the device and prepared for local runtime

## Current Architecture

### Mobile app

- Expo Router + React Native
- Android development build target with `expo-dev-client`
- optional Hugging Face device-code OAuth for gated model sources
- local model download/prep state surfaced in onboarding, settings, and chat
- local generation interface for:
  - clarification/spec generation
  - patch generation
  - audio transcription placeholder path

### Backend

- Hono API
- Convex for auth callbacks, user/workspace/conversation/job state
- Octokit for repo snapshotting and commit/push
- Puppeteer for screenshotting pasted URLs

## Request Flow

1. Open the Android dev build.
2. Connect GitHub through the existing Convex OAuth flow.
3. Download the Android LiteRT model artifact from workspace settings.
4. Send text, image, URL, or audio input from the chat screen.
5. Vibex fetches repo context from the backend and generates the clarification/spec locally.
6. On confirm, Vibex generates a patch locally and sends the patch to the backend.
7. The backend commits that patch to GitHub and monitors deploy checks through Convex job updates.

## Repo Structure

- `front-end/` - Expo mobile app and Android local-model integration
- `backend/` - Hono API, GitHub integration, screenshot capture, Convex bridge
- `tools/gemma-task/` - conversion and publish helpers for custom mobile model artifacts

## Important API Changes

- Removed:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `OPENAI_TRANSCRIPTION_MODEL`
  - every request-level `openai_api_key`
- Added:
  - `POST /repo-context`
  - patch-based `POST /confirm`
  - conversation persistence `POST /conversation` for locally generated turns/specs

## Front-end Environment

Create `front-end/.env.local` with:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_WEB_API_URL=http://localhost:8787
EXPO_PUBLIC_AUTH_URL=https://your-convex-site.convex.site
EXPO_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
EXPO_PUBLIC_APP_SCHEME=vibex
EXPO_PUBLIC_HF_OAUTH_CLIENT_ID=
EXPO_PUBLIC_GEMMA_MODEL_ID=gemma-4-e4b-it-litertlm
EXPO_PUBLIC_GEMMA_MODEL_VERSION=litert-community
EXPO_PUBLIC_GEMMA_MODEL_FILE=gemma-4-E4B-it.litertlm
EXPO_PUBLIC_GEMMA_MODEL_URL=https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it.litertlm
EXPO_PUBLIC_GEMMA_MODEL_CHECKSUM=f335f2bfd1b758dc6476db16c0f41854bd6237e2658d604cbe566bcefd00a7bc
EXPO_PUBLIC_GEMMA_MODEL_SIZE_BYTES=3654467584
EXPO_PUBLIC_GEMMA_MODEL_REQUIRES_AUTH=false
```

## Backend Environment

Create `backend/.env` with:

```bash
PORT=8787
APP_URL=http://localhost:8787
CONVEX_URL=
CONVEX_DEPLOYMENT=
SMITHERY_REGISTRY_URL=https://registry.smithery.ai/v1/skills
STITCH_PROJECT_ENDPOINT=
VIBE_DEPLOY_COMMITTER_NAME=VibeDeploy
VIBE_DEPLOY_COMMITTER_EMAIL=hello@vibedeploy.app
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the backend:

```bash
pnpm dev:api
```

Run the Android dev-client Metro server:

```bash
pnpm dev:android
```

Build or launch the Android development client:

```bash
pnpm --filter front-end prebuild:android
pnpm --filter front-end run:android
```

Android builds for the LiteRT Gemma runtime require a full JDK 21 with `jlink`, not just a JRE or trimmed JetBrains runtime. The workspace is also configured with pnpm's hoisted linker in `.npmrc` because Expo native builds on Windows are much more reliable with shorter dependency paths.

Optional checks:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

## Model Conversion and Publish

The Android app defaults to the public LiteRT community Gemma 4 `.litertlm` build. If you want to point Vibex at a private or custom model instead, the helper docs in `tools/gemma-task/` still describe how to prepare and publish your own artifact.

Use the helper docs in [tools/gemma-task/README.md](./tools/gemma-task/README.md) to:

1. download the source checkpoint
2. convert it into LiteRT assets and a mobile bundle
3. publish the bundle and manifest to a Hugging Face repo
4. copy the published values into `front-end/.env.local`

For gated or custom Hugging Face model downloads, Vibex can use the Convex-hosted OAuth metadata URL as the public client ID, so you do not need to manually create an OAuth app if your Convex site is reachable.

## Notes

- This branch targets Android first.
- GitHub auth and workspace state remain in Convex.
- The default model source is public, so end users do not need Hugging Face auth unless you switch Vibex to a gated artifact.
- The local generation layer currently uses the new on-device architecture and model lifecycle, while keeping the repo push flow intact and testable.
