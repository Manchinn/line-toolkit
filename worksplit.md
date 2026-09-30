# Multi-Agent Worksplit & Ownership Contract

**Project:** LINE Toolkit Studio (`web-projects/line-toolkit`)  
**Agreed by:** Hermes Agent (Orchestrator) & Claude Code (Specialist Engine)  
**Coordination Channel:** Orca CLI Terminal (`orca terminal send/read/wait`)

---

## 1. Role Division

### 🔹 Hermes Agent (Lead Orchestrator & UI/QA)
- **Primary Focus:** Project Context, State Management, UI/UX Interaction, Integration QA & Verification.
- **Exclusive File Ownership:**
  - `src/components/**` (Canvas overlay, Action drawers, Simulator, Tab manager)
  - `src/app/page.tsx` & `src/app/layout.tsx` & `src/app/globals.css`
  - `src/store/**` (Zustand client & card stores)
  - `docs/**` & Project documentation

### 🔸 Claude Code (Core Engine & Backend Specialist)
- **Primary Focus:** Pure Logic, Geometry Math, Payload Builders, API Proxies, Strict Unit Test Suites.
- **Exclusive File Ownership:**
  - `src/lib/richmenu/**` (Geometry calculations, Preset layouts, Payload serializers)
  - `src/lib/flex/**` (Flex Message builder, Carousel validators, Type guards)
  - `src/app/api/**` (Next.js server route handlers, LINE API proxy, Deploy flow)
  - `tests/**` & unit test specs (`*.test.ts`)

### 🤝 Shared Contracts (Requires Explicit Mutual Agreement)
- `src/types/line.ts` (Core TypeScript interfaces)
- `package.json` / dependency additions

---

## 2. Interaction Protocol via Orca CLI

1. **Task Kickoff:** Hermes sends structured task briefs to Claude's terminal pane in Orca via `orca terminal send`.
2. **Autonomous Execution:** Claude executes in its assigned paths, runs local verification tests (`pnpm test`).
3. **Completion Notice:** Claude reports summary and modified files back in the Orca terminal.
4. **Hermes Gate Review:** Hermes inspects git diff, runs full build (`pnpm build`), and verifies acceptance criteria.
