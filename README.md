# Vibex

Vibex is a mobile-first Codex-style workspace for shipping live website changes from GitHub repos.
It lets a user sign in with GitHub, pick or create a repo, speak or type a request, attach screenshots or URLs, and watch the app turn that input into a spec, a patch, a GitHub commit, and a deployment update.

## Problem Statement

Modern coding assistants are powerful, but the workflow is still split across too many surfaces:

- chat in one place
- code in another
- repo access in another
- deploy feedback somewhere else

Vibex collapses those steps into one mobile workflow so a user can move from idea to live change without leaving the app.

## Solution

Vibex provides:

- GitHub OAuth and repo selection
- create-new-repo support for personal accounts and organizations
- text, voice, image, and URL inputs
- short clarification before code is written
- OpenAI-powered transcription, planning, and code generation
- GitHub commit/push for the final patch
- deployment tracking from commit checks/status
- in-app notifications for important job state changes
- workspace skills, MCP context, and `agents.md`-style instructions

## How The Flow Works

1. The user opens the app and connects GitHub.
2. Vibex asks for an OpenAI API key during onboarding, or falls back to the backend key if the user skips it.
3. The user selects an existing repo or creates a new starter repo.
4. The user starts a chat with text, voice, screenshots, or URLs.
5. Voice is transcribed before the model sees it.
6. Images and URL screenshots are sent as visual references.
7. The model asks at most a few clarification questions and returns a structured spec.
8. When the user confirms, Vibex generates a file patch, commits it to GitHub, and watches deployment state.
9. Status changes are surfaced in-app with lightweight notifications.

## Demo URL
https://drive.google.com/drive/folders/15sgglhfzDkYlsflCY7PD41GSMxXl5Jvp?usp=sharing

## AI Model Path

Vibex currently uses OpenAI end to end for the user-facing AI flow:

- `gpt-4o-mini-transcribe` for voice input
- `gpt-5.4` for clarification and spec-building
- `gpt-5.4` for patch generation

If the user supplies their own `OPENAI_API_KEY`, Vibex sends that key with backend model requests.
If they skip it, Vibex falls back to the backend OpenAI key.

## Repository Structure

- `front-end/` - Expo React Native app
- `backend/` - Hono API and server logic
- `backend/convex/` - Convex schema and realtime job storage

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | Expo, React Native, Expo Router |
| State | Zustand |
| Auth | GitHub OAuth via Convex-hosted HTTP actions |
| Backend API | Hono + TypeScript |
| Repo operations | Octokit |
| AI | OpenAI Responses API + audio transcription API |
| Screenshot capture | Puppeteer |
| Realtime state | Convex |

## Technical Specs

### Front-end

- Mobile-first dark UI with a loading screen, GitHub-first onboarding, and workspace screens.
- Keyboard-safe forms for onboarding and settings.
- Persistent local session state with optional user-provided OpenAI API key.
- In-app notifications for deploy and job updates.

### Backend

- Routes for auth, repo listing, repo creation, screenshots, conversation, confirm, skills, MCPs, and projects.
- OpenAI API key can come from either the backend environment or the user’s onboarding settings.
- Conversation requests support `text`, `voice`, `image`, and `url` inputs.
- Confirm requests generate a patch, commit it to GitHub, and monitor deployment progress.

### Data Model

- Users store GitHub session details and local app preferences.
- Projects point to a GitHub repo and branch.
- Conversations store message history and the current spec.
- Jobs track generation, push, deploy, live, and failure states.
- Skills and MCP context are persisted per user/project.

## Environment Variables

### Backend

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
APP_URL=http://localhost:8787
PORT=8787
```

GitHub OAuth secrets are stored in Convex for the current auth flow.

### Front-end

```bash
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_AUTH_URL=https://kindhearted-goat-160.convex.site
EXPO_PUBLIC_CONVEX_URL=...
EXPO_PUBLIC_APP_SCHEME=vibex
```

## Local Development

```bash
pnpm install
pnpm dev:api
pnpm dev:app
```

Optional:

```bash
pnpm dev:convex
pnpm lint
pnpm typecheck
pnpm test
```

## Deployment Notes

- GitHub is the source of truth for repo access and commits.
- Convex handles auth callbacks and realtime job state.
- The Hono backend handles AI orchestration, repo operations, screenshots, and deploy monitoring.
- The app does not require manual Vercel polling. Deploy feedback comes from GitHub commit checks and status updates.

## Why This Repo Exists

This project is a hackathon-grade prototype of a mobile Codex experience:

- quick to onboard
- fast to demo
- transparent about what the backend is doing
- good enough to ship a real repo change from a phone

