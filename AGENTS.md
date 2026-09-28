<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# LINE Toolkit Studio (web-projects/line-toolkit)

In-house visual editor and orchestrator for LINE Official Account Rich Menus, Tab Switchers (Aliases), and Messaging API.

## Tech Stack & Commands

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- **Package Manager:** `pnpm`
- **Dev Server:** `pnpm dev` (Default port: `http://localhost:3000`)
- **Build & Check:** `pnpm build` (Runs Next.js build + full TypeScript check)
- **Lint:** `pnpm lint`

## Project Structure & Architecture

- `src/app/page.tsx` — Main interactive dashboard (3-column layout: Client/Tab Manager, Visual Canvas, Action Editor).
- `src/components/RichMenuCanvas.tsx` — Visual editor canvas for drawing bounding boxes scaled to LINE dimensions.
- `src/components/ActionEditor.tsx` — Configurator for URI, Message, and Rich Menu Switch (Alias) actions.
- `src/components/ClientManager.tsx` — Multi-client switcher storing credentials locally in browser `localStorage`.
- `src/app/api/richmenu/deploy/route.ts` — Server endpoint handling 4-step deployment: Schema creation, image binary upload, alias binding, and default menu setting.
- `src/app/api/richmenu/list/route.ts` — List and delete rich menus and aliases via LINE Messaging API.
- `src/types/line.ts` — TypeScript interfaces for clients, tabs, areas, and LINE API payload shapes.

## Standards & Pitfalls

- **LINE Image Dimensions:** Standard full-size is `2500x1686 px`; compact size is `2500x843 px`. Max file size is 1 MB (PNG/JPEG).
- **Coordinate Scaling:** All canvas bounds must scale accurately to the native LINE resolution before submitting to `/v2/bot/richmenu`.
- **Secrets & Storage:** Client Channel Access Tokens are saved only in client-side `localStorage` to avoid storing third-party secrets on server disks.
- **Port Collisions:** Verify port `3000` availability before running `pnpm dev`. Kill stale processes using `netstat -ano | grep 3000` and `taskkill -F -PID <pid>`.
