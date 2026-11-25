# tydarSU

A mobile-friendly visual app builder in the spirit of Scratch, but simpler. Snap blocks together to make small apps such as counters, calculators, quizzes and login screens, then run them, export them or share them as code.

**Live app:** https://shonisani00.lovable.app

## What you can do

- **Build with blocks.** 77 blocks in 21 categories: UI, forms, screens, logic, loops, math, data, database, auth and more.
- **Start simple.** The block palette opens in **Basic** (17 beginner blocks). Backend, realtime, auth, database and other advanced blocks stay hidden until you tap **All blocks**. Your choice is remembered on the device.
- **See your connections.** Blocks are joined by visible wires. Drag from the dot on a block's right edge onto another block to connect them, or tap the link icon. Tap a wire, then the ✕, to remove it. If / Else wires are labelled true and false.
- **Run instantly.** Preview your app in the browser, with a slow mode that steps through blocks one at a time.
- **Learn with challenges.** Learning mode gives you 8 goals, from "say hello" to "make a counter that stops at 10". Your blocks are run with the real interpreter to check each one automatically, and progress is saved on the device.
- **Start from a template.** Counter, Calculator, Notes App, Greeter, Timer, Mini Quiz, Login Screen and REST API Fetcher.
- **Ask the AI.** The AI Assistant has three tabs, and all of them require sign-in:
  - **Build** creates a new app from a description.
  - **Edit** suggests changes to your current project. You review a before-and-after list and choose to apply or discard. Applying can be undone.
  - **Explain** describes in plain words what your project does.
- **Export and import.** JSON, standalone HTML, or a React/TypeScript project.
- **Save anywhere.** Projects save on the device, and to your account when you are signed in.
- **Pick a look.** Light, dark or glass theme, with undo and redo in the workspace.

## Quick start

You need Node.js 18 or newer and npm.

```bash
npm install
cp .env.example .env     # then fill in your Supabase values
npm run dev              # http://localhost:8080
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 8080 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest suite |
| `npm run lint` | Run ESLint |

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase (auth, database, edge functions) and Vitest. Built with [Lovable](https://lovable.dev).

## Project structure

```
src/
  components/tydarsu/   Editor UI: sidebar, workspace, wires, preview, modals, AI assistant, learning mode
  hooks/                useProject, useAuth, useHistory, useBlockMode, useChallenges
  lib/                  interpreter, templates, exporters, blockModes,
                        wires (connection geometry), challenges (goals and checks), aiEdit (apply and preview AI changes)
  types/blocks.ts       Block types, definitions, colors and categories
  pages/                Index (editor) and Auth
  test/                 Unit tests
supabase/
  functions/ai-block-generator/   AI edge function (index.ts) and its validator (validate.ts)
  migrations/                     Database schema and policies
```

## Backend setup

The editor works without a backend (projects save on the device). Accounts, cloud saves and the AI builder need a Supabase project.

1. Put your project values in `.env` (see `.env.example`).
2. Apply the migrations: `supabase db push`.
3. Set the function secrets, then deploy:

```bash
supabase secrets set LOVABLE_API_KEY=your-ai-gateway-key
supabase secrets set ALLOWED_ORIGINS=https://your-domain.com   # optional, extra origins
supabase secrets set AI_HOURLY_LIMIT=20                         # optional, default 20
supabase functions deploy ai-block-generator
```

Apply the migrations **before** deploying the function. The AI builder checks each user's quota in the database and refuses requests if that check cannot run.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to edge functions by Supabase automatically.

## How the AI Assistant is protected

The function in `supabase/functions/ai-block-generator` serves Build, Edit and Explain. It does not trust the browser or the model:

- **Sign-in required.** The anon key alone is rejected, and so are anonymous users.
- **Rate limited per user.** 20 requests per hour by default, shared across all three tabs, tracked in the `ai_usage` table (no client access, service role only).
- **Origin allowlist.** Only your app's origins get CORS access. Add custom domains with `ALLOWED_ORIGINS`.
- **Bounded input and cost.** Build prompts are limited to 1,000 characters and 8 KB. Edit and Explain also send your project, up to 150 blocks and 160 KB. Model calls have a token cap and a 45 second timeout.
- **Validated output.** Every reply is checked before it reaches the app. Only the block types the prompt documents are allowed (never `customCode`), ids and connections are verified, strings and coordinates are clamped, and unsafe object keys are removed. Anything that fails is dropped and the app says how many.
- **Edits are narrow.** The AI can add blocks, and change or remove existing blocks of the types it can build. It cannot change a block's type or touch Custom Code. Nothing is applied until you approve the preview.
- **Your project is treated as data.** Block names and settings are sent to the model as data, never as instructions, so text inside a project cannot change how the AI behaves.

## Safety notes for projects

- The **Custom Code** block runs inside a sandboxed iframe. Keep that sandbox without `allow-same-origin` if you change it.
- The **API Request** block can call any URL. Only run imported projects you trust.
- Everything prefixed `VITE_` is public. Keep secret keys in Supabase function secrets, never in `.env`.

## Customizing

- **Which blocks are Basic:** edit `BASIC_BLOCKS` in `src/lib/blockModes.ts`.
- **Add a block:** add it to `src/types/blocks.ts`, to a category in `BlockSidebar.tsx`, and handle it in `src/lib/interpreter.ts`. If the AI should be able to generate it, also add it to `ALLOWED_BLOCK_TYPES` in `validate.ts` and describe it in the system prompt in `index.ts`.
- **Add a template:** add an entry in `src/lib/templates.ts`.
- **Add a challenge:** add an entry to `CHALLENGES` in `src/lib/challenges.ts`. A check receives the learner's blocks and the result of running them, and can run the app again with different values to test how it reacts. Checks only ever run Basic blocks, so they cannot reach the network, database or Custom Code.

## Ideas for what's next

- Public share links and remixing other people's projects
- Accept or reject each AI change one by one instead of all at once
- Wires that light up while an app runs
- More challenges, including ones that use screens and the Custom Code block
- Installable PWA and a QR code to open a project on another device
- Unit tests for the rest of the interpreter, and splitting it into smaller modules

## Contributing to the Lovable project

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c9620341-f1f8-429f-985f-a09f437acc11). Changes pushed to this repository sync with Lovable.
# Visual-
