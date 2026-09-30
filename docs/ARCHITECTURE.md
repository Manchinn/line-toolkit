# LINE Toolkit Studio — Architecture & Subsystem Specification

## 1. System Overview
LINE Toolkit Studio is a high-density, client-side first visual workbench for building, simulating, and batch-deploying LINE Official Account (OA) assets:
1. **Multi-Tab Rich Menus with Seamless Alias Switching** (Sub-second tab switching inside LINE Chat).
2. **Interactive Rich Menu Canvas** with sub-pixel to 2500x1686 / 2500x843 native coordinate scaling.
3. **Card Studio (Flex Message Builder)** for generating compliant Carousel & Bubble JSON payloads.
4. **Stateless Edge Deployer Proxy** executing 4-step deployment pipelines directly against LINE Messaging API.

---

## 2. Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Browser Client (SPA)                            │
│  - Next.js 16 App Router + React 19 + Tailwind CSS v4                  │
│  - Zustand Stores: `toolkit-store.ts`, `card-store.ts`                 │
│  - Security: Channel Access Tokens strictly stored in localStorage     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Next.js API Routes (Stateless Proxy)                   │
│  - `POST /api/richmenu/deploy` (4-step atomic per-tab deploy)          │
│  - `POST /api/richmenu/list`   (query/delete menus & aliases)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      LINE Messaging API                                │
│  - `/v2/bot/richmenu` (schema definition)                              │
│  - `/v2/bot/richmenu/{id}/content` (JPEG/PNG binary <= 1MB)            │
│  - `/v2/bot/richmenu/alias` (alias binding for seamless tab switch)    │
│  - `/v2/bot/user/all/richmenu/{id}` (default menu assignment)          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Subsystem Breakdown & Directory Map

### 3.1 Domain Logic & Pure Utilities (`src/lib/`)
- `src/lib/richmenu/geometry.ts`: Coordinate scaling, bounds collision, boundary clamping between screen DOM pixels and LINE resolution (`2500x1686` or `2500x843`).
- `src/lib/richmenu/presets.ts`: Grid layouts (2x3, 2x2, TabBar + 3, 1x3, 1x2).
- `src/lib/richmenu/actions.ts`: LINE Action mapping (`uri`, `message`, `richmenuswitch`, `postback`).
- `src/lib/richmenu/autolink.ts`: One-click mutual alias link generator between multi-tab menus.
- `src/lib/richmenu/payload.ts`: Builder converting client state into valid LINE `/v2/bot/richmenu` JSON.
- `src/lib/flex/builder.ts` & `src/lib/flex/types.ts`: LINE Flex Message bubble and carousel generation.

### 3.2 State Management (`src/store/`)
- `src/store/toolkit-store.ts`: Active client selection, tokens (localStorage sync), active tabs, rich menu areas, active canvas selection, simulation state.
- `src/store/card-store.ts`: Flex Card Studio state (cards, styles, actions, carousel items).

### 3.3 Visual Components (`src/components/`)
- `RichMenuCanvas.tsx`: Interactive SVG/Canvas overlay for drawing and resizing tap bounding boxes.
- `ActionEditor.tsx`: Configuration drawer for per-box action types and parameters.
- `TabNavigator.tsx` & `TabAutoLinker.tsx`: Multi-tab management and automated alias wiring.
- `DeviceSimulator.tsx`: Live mobile frame previewing interactive tab switches and action triggers.
- `ClientManager.tsx`: Switching between LINE OA accounts/tokens securely.

### 3.4 API Route Handlers (`src/app/api/`)
- `src/app/api/richmenu/deploy/route.ts`:
  1. Validate coordinates & actions (reject unconfigured or out-of-bound areas).
  2. Create menu definition on LINE API.
  3. Upload image binary (PNG/JPEG <= 1MB).
  4. Delete existing alias with same name + Bind new alias.
  5. If default tab, link to all users.
- `src/app/api/richmenu/list/route.ts`:
  - List all active rich menus and aliases for the active channel token.
  - Delete stale/orphan rich menus.

---

## 4. Operational Guardrails & LINE Constraints
1. **Resolution Bounds:** Full = `2500 x 1686`, Compact = `2500 x 843`. All box coordinates `(x, y, width, height)` must be positive integers and must fit within bounds.
2. **Maximum Areas:** Maximum 20 areas per rich menu.
3. **Alias Key Format:** Letters `[a-zA-Z]`, numbers `[0-9]`, `_`, `-`, max 32 characters.
4. **Token Security:** Tokens MUST NEVER be logged, committed, or saved to server disk or cloud database.
