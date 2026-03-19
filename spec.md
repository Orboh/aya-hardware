# AYA Hardware — Improvement Spec

AYA is an open-source AI-powered copilot for hardware development — "Figma for hardware engineers."
Visual system diagrams, parts management, compatibility analysis, and AI assistant in one web app.
Built with Next.js 15, TypeScript, Prisma, PostgreSQL, @xyflow/react.

This project was open-sourced by Orboh after pivoting to humanoid robotics.
100+ waitlist users expressed interest. The goal is to make hardware dev accessible to anyone with an idea.

## Guiding Principles

- **OSS-first**: Every change should make it easier for contributors to onboard and use
- **Stability over features**: Fix what's broken before adding new things
- **Small, verifiable commits**: One concern per commit, tests must pass

## Task Queue

Work these in order. Each auto-fixer run picks the next incomplete task.

---

### 1. TypeScript compilation — zero errors
- **Priority**: P0
- **Goal**: `npx tsc --noEmit` exits 0
- **Approach**: Fix type mismatches, missing imports, incorrect generics one file at a time
- **Constraint**: Max 20 files per run. Never modify package.json.
- **Status**: in-progress (~10 errors remaining from 877)

### 2. Test suite — all tests green
- **Priority**: P0
- **Goal**: `npx jest --passWithNoTests` — 0 failures
- **Current**: 29 suites failing, 69 tests failing out of 191
- **Root causes**: Broken imports after type fixes, missing mocks, stale test assertions
- **Approach**: Fix import paths first, then mock mismatches, then assertion updates
- **Constraint**: Do not weaken tests. If implementation is correct and test is wrong, fix the test. If unclear, skip.
- **Status**: pending

### 3. Lint cleanup
- **Priority**: P1
- **Goal**: `npm run lint` — 0 errors (warnings OK)
- **Current**: ~3 lint errors (mostly `@typescript-eslint/no-explicit-any`)
- **Approach**: Add proper types to replace `any`, following existing patterns in the codebase
- **Status**: pending

### 4. API route hardening
- **Priority**: P1
- **Goal**: All 45 API routes in `app/api/` handle errors gracefully
- **Scope**:
  - Wrap handlers in try-catch
  - Return structured JSON errors: `{ error: string, status: number }`
  - Validate required fields from request body
  - Return 400 for bad input, 500 for internal errors
- **Files**: `app/api/**/route.ts`
- **Constraint**: Do not change happy-path behavior. Only add error handling.
- **Status**: pending

### 5. React error boundaries for critical UI
- **Priority**: P1
- **Goal**: App doesn't white-screen when a component crashes
- **Scope**:
  - Add error boundary around Canvas (`components/canvas/`)
  - Add error boundary around ChatPanel (`components/chat/`)
  - Add error boundary around PBS panel (`components/parts/`, `components/procurement/`)
  - Each boundary shows a user-friendly fallback with retry button
- **Approach**: Create a reusable `ErrorBoundary` component, wrap the 3 panels
- **Status**: pending

### 6. Onboarding DX — make `npm run dev` work out of the box
- **Priority**: P1
- **Goal**: New contributor can clone, install, and run dev server in <5 minutes
- **Scope**:
  - Add docker-compose.yml with PostgreSQL for local dev
  - Ensure `npx prisma migrate dev` works with example .env
  - Add seed script for demo data
  - Update README with step-by-step quickstart
- **Constraint**: Don't break existing PostgreSQL setup. Additive only.
- **Status**: pending

### 7. Component compatibility checker — restore pricing
- **Priority**: P2
- **Goal**: Parts pricing in compatibility view works without Octopart API key
- **Current**: Octopart API key is expired/missing. Pricing shows "N/A"
- **Approach**: Integrate Perplexity API for real-time pricing (see CLAUDE.md: `perplexity-pricing-integration`) or add sensible fallback with manual price entry
- **Status**: pending

### 8. Improve test coverage for core utilities
- **Priority**: P2
- **Goal**: Test coverage for `utils/components/`, `utils/chat/`, `utils/project/`
- **Scope**:
  - `componentManager.ts` — add/remove/update components
  - `partsExtractor.ts` — parse parts from AI response
  - `chatUtils.ts` — message formatting, stream handling
  - `projectUtils.ts` — save/load/merge project state
- **Approach**: Unit tests with jest, mock external deps (OpenAI, DB)
- **Status**: pending

## Completed
<!-- Auto-fixer moves completed tasks here -->
