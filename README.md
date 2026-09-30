# LINE Toolkit Studio

In-house workbench for designing and deploying LINE Official Account Rich Menus,
tab switchers (Rich Menu Aliases), and Flex Message card carousels.

Production: https://line-toolkit.vercel.app/

## Features

- **Rich Menu canvas** — draw tap areas on the menu image; bounds are stored as
  integers in native LINE resolution (`2500x1686` full, `2500x843` compact).
- **Action configurator** — `uri`, `message`, `richmenuswitch`, `postback`, with
  color-coded badges on the canvas. Unconfigured areas block deploy.
- **Grid presets** — 2x3, 2x2, Tab Bar + 3, 1x3 for both sizes.
- **Multi-tab auto linker** — one click creates the tab-switch buttons between
  two menus (`richmenuswitch` → target alias). Idempotent; warns on overlap and
  area limits.
- **Device simulator** — phone mockup to test menu switching, message bubbles,
  URI previews, and chat bar toggle before deploying.
- **Card Studio** — person/product Flex templates, carousel up to 12 cards,
  copy LINE-compliant Flex JSON.
- **Batch deploy** — deploy all tabs, bind aliases, and set the default menu.

## Deploy flow

`POST /api/richmenu/deploy` runs per tab:

1. Create the rich menu (`POST /v2/bot/richmenu`)
2. Upload the image (`POST /v2/bot/richmenu/{richMenuId}/content`)
3. Re-bind the alias (`DELETE` then `POST /v2/bot/richmenu/alias`)
4. Optionally set as default (`POST /v2/bot/user/all/richmenu/{richMenuId}`)

The route validates the payload with the same rules as the editor
(`422` on invalid areas/actions, `413` for images over 1 MB).

## Security model

- Channel Access Tokens are stored **only in browser `localStorage`**
  (`src/store/toolkit-store.ts`). They are sent per request to the API routes, which proxy to
  the LINE Messaging API and never persist them.
- The API routes have no auth of their own; anyone with the URL can use them as
  a LINE API proxy with **their own** token. Do not store server-side secrets here.

## Development

Requires Node.js and `pnpm@10`.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # vitest (unit tests for geometry, presets, autolink, payload, flex)
pnpm lint
pnpm build    # Next.js build + TypeScript check
```

If port 3000 is busy on Windows:

```bash
netstat -ano | grep 3000
taskkill -F -PID <pid>
```

## Project structure

```text
src/
├── app/
│   ├── page.tsx                  # 3-column dashboard
│   └── api/richmenu/
│       ├── deploy/route.ts       # 4-step deploy to LINE
│       └── list/route.ts         # list / delete menus and aliases
├── components/
│   ├── RichMenuCanvas.tsx        # visual area editor
│   ├── ActionEditor.tsx          # per-area action config
│   ├── GridPresetBar.tsx
│   ├── TabAutoLinker.tsx
│   ├── DeviceSimulator.tsx
│   ├── ClientManager.tsx         # multi-client tokens (localStorage)
│   └── card-studio/              # Flex carousel builder
├── lib/
│   ├── richmenu/                 # geometry, presets, actions, autolink, payload
│   └── flex/                     # Flex Message builder + types
├── store/                        # zustand stores
└── types/line.ts                 # LINE API payload types
```

## LINE constraints

- Image: PNG/JPEG, max 1 MB, exactly `2500x1686` or `2500x843`
- Max 20 areas per rich menu
- Alias ID: letters, digits, `_`, `-` (max 32 chars)
- Flex carousel: max 12 bubbles
