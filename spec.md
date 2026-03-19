# AYA Hardware — Auto-Fixer Spec

This file defines implementation tasks for the autonomous fixer.
Tasks are worked on one at a time, in order. Each run has a 10-minute limit.

## Task Queue

### 1. Fix TypeScript compilation errors
- **Priority**: Critical
- **Goal**: Reduce TSC errors to 0
- **Approach**: Fix type mismatches, missing imports, incorrect generics
- **Constraint**: Fix at most 20 files per run, focus on most impactful errors first
- **Status**: in-progress

### 2. Fix failing tests
- **Priority**: High
- **Goal**: All jest tests pass
- **Approach**: Fix broken imports, mock mismatches, outdated test assertions
- **Constraint**: Do not modify test expectations unless the implementation is correct and test is wrong
- **Status**: pending

### 3. Fix lint errors
- **Priority**: Medium
- **Goal**: `npm run lint` passes cleanly
- **Approach**: Fix eslint violations following project's existing patterns
- **Status**: pending

### 4. Add error boundaries to key components
- **Priority**: Medium
- **Goal**: Wrap Canvas, ChatPanel, and PBS components with React error boundaries
- **Files**: `components/canvas/`, `components/chat/`, `components/pbs/`
- **Status**: pending

### 5. Improve API route error handling
- **Priority**: Medium
- **Goal**: All API routes in `app/api/` return proper error responses with status codes
- **Approach**: Add try-catch, validate inputs, return structured error JSON
- **Status**: pending

### 6. Add integration tests for core API endpoints
- **Priority**: Low
- **Goal**: Test coverage for `/api/chat`, `/api/compatibility`, `/api/projects`
- **Status**: pending

## Completed
<!-- Completed tasks will be moved here by the auto-fixer -->
