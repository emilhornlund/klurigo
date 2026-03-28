# AGENTS.md

This document defines **how AI agents and contributors are expected to work in the `klurigo` monorepo**. Follow these instructions strictly to avoid breaking workspace assumptions, CI pipelines, or architectural constraints.

---

## Repository Overview

- **Monorepo**: Yarn workspaces
- **Packages**:
  - `@klurigo/common` – shared domain models, enums, utilities
  - `@klurigo/klurigo-web` – frontend (React + Vite + SCSS modules)
  - `@klurigo/klurigo-service` – backend (NestJS)
- **Node.js**: >=24 <25 required
- **Tools**: TypeScript 5.9.3, ESLint 9.39.2, Prettier 3.7.4

All packages are built, linted, and tested **via the root workspace** unless explicitly stated otherwise.

---

## Build, Lint, and Test Commands

### Root-Level Commands (Preferred)

- `yarn clean` – Clean all package build artifacts
- `yarn build` – Build all packages
- `yarn lint` – Lint all packages
- `yarn lint:fix` – Auto-fix lint issues
- `yarn test` – Run all tests concurrently (common + backend + frontend)
- `yarn test:coverage` – Run all tests with coverage
- `yarn check-types` – Run TypeScript type checking across all packages

### Development Commands

- `yarn dev` – Run frontend and backend concurrently
- `yarn serve` – Serve built frontend and backend concurrently

### Package-Specific Commands

Use these **only when scoping is required**.

#### Common (`@klurigo/common`)

- `yarn workspace @klurigo/common build` – Build TypeScript to dist/
- `yarn workspace @klurigo/common test` – Run Vitest tests
- `yarn workspace @klurigo/common test:coverage` – Run tests with coverage

#### Frontend (`@klurigo/klurigo-web`)

- `yarn workspace @klurigo/klurigo-web dev` – Start Vite dev server
- `yarn workspace @klurigo/klurigo-web build` – Build for production
- `yarn workspace @klurigo/klurigo-web test` – Run Vitest tests
- `yarn workspace @klurigo/klurigo-web test:watch` – Run tests in watch mode
- `yarn workspace @klurigo/klurigo-web test:coverage` – Run tests with coverage
- `yarn workspace @klurigo/klurigo-web storybook` – Start Storybook
- `yarn workspace @klurigo/klurigo-web test:e2e` – Run Playwright E2E tests

#### Backend (`@klurigo/klurigo-service`)

- `yarn workspace @klurigo/klurigo-service dev` – Start NestJS in watch mode
- `yarn workspace @klurigo/klurigo-service build` – Build NestJS application
- `yarn workspace @klurigo/klurigo-service test` – Run Jest tests
- `yarn workspace @klurigo/klurigo-service test:coverage` – Run tests with coverage
- `yarn workspace @klurigo/klurigo-service check-circular-deps` – Check for circular dependencies

### Running a Single Test File

- **Frontend**: `yarn workspace @klurigo/klurigo-web vitest run path/to/file.test.ts`
- **Backend**: `yarn workspace @klurigo/klurigo-service jest path/to/file.spec.ts`
- **Common**: `yarn workspace @klurigo/common vitest run path/to/file.spec.ts`

---

## Code Style Guidelines

### Formatting

- **Prettier**: Enforced via ESLint
- No semicolons
- Single quotes
- 2-space indentation
- Trailing commas where valid
- `printWidth: 80`
- `bracketSpacing: true`
- Frontend only: `bracketSameLine: true`

Do not reformat files unnecessarily.

### Imports

- **Order** (strictly enforced):
  1. Built-in Node.js modules
  2. External dependencies (npm packages)
  3. Internal workspace packages (`@klurigo/*`)
  4. Parent directory imports (`../`)
  5. Sibling imports (`./`)
  6. Index imports (`./index`)
  7. Side-effect imports

- One empty line between groups
- Alphabetize within groups (case-insensitive)
- Do not include file extensions in TypeScript imports (enforced by ESLint).

### TypeScript Rules

- `strict` mode enabled everywhere
- No `any` types (except in test files or when absolutely justified)
- Strong typing required
- Explicit return types for React components
- Prefer `type` aliases for object shapes; avoid `interface` unless there is a clear reason (e.g., declaration merging).
- Avoid type assertions (`as`) unless necessary

#### Common (`@klurigo/common`)

- Pure TypeScript only
- No runtime dependencies
- Comprehensive JSDoc documentation for public APIs
- Guard clauses and input validation in utility functions
- Throw `Error` objects for invalid inputs

#### Backend (`@klurigo/klurigo-service`)

- NestJS decorators and DTOs for validation
- Controllers are thin (delegate to services)
- Services contain business logic
- Repositories handle data persistence
- Use class-validator decorators for input validation
- Prefer event-driven patterns over direct coupling

#### Frontend (`@klurigo/klurigo-web`)

- React functional components only
- Explicit return types on all components
- Hooks for state management
- Context API for global state
- SCSS modules for styling (no global CSS)
- Prefer immutable patterns (`useMemo`, `useCallback` judiciously)

### Naming Conventions

- **Components**: `PascalCase` (e.g., `Button`, `GameLobby`)
- **Files**: `kebab-case.ts` (e.g., `array-utils.ts`, `game-event-type.enum.ts`)
- **Functions/Variables**: `camelCase` (e.g., `shuffleArray`, `isValidEmail`)
- **Classes**: `PascalCase` (e.g., `GameController`, `UserService`)
- **Enums**: `PascalCase.enum.ts` (e.g., `GameEventType.enum.ts`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`)
- **Interfaces**: `PascalCase` with `I` prefix optional but consistent within domain

Naming must reflect **domain intent**, not implementation details.

### Error Handling

- Throw `Error` objects with descriptive messages
- Use guard clauses for input validation
- Backend: Use NestJS exception filters for HTTP responses
- Frontend: Handle errors in components or custom hooks
- Test error conditions explicitly

---

## Architecture Guidelines

### Frontend (`@klurigo/klurigo-web`)

- **Components**: Functional components with explicit TypeScript interfaces
- **State**: React hooks + Context API (avoid Redux unless complexity requires it)
- **Styling**: SCSS modules only (no global CSS, no CSS-in-JS)
- **API**: Centralized API client with React Query for server state
- **Routing**: React Router with proper route guards
- **Animations**: Use existing SCSS animation helpers and patterns
- **No direct backend assumptions**: All communication through defined APIs

### Backend (`@klurigo/klurigo-service`)

- **Structure**: Feature-based modules with controllers, services, repositories
- **Controllers**: Thin layer for HTTP handling and validation
- **Services**: Business logic and orchestration
- **Repositories**: Data access layer (MongoDB with Mongoose)
- **Events**: BullMQ for background jobs and event-driven architecture
- **Validation**: class-validator decorators on DTOs
- **Circular dependencies**: Treated as architectural defects - avoid `forwardRef`

### Common (`@klurigo/common`)

- **Purpose**: Shared contracts and utilities
- **Dependencies**: None (pure TypeScript)
- **Content**: Domain models, enums, type definitions, utility functions
- **Testing**: Comprehensive unit tests with Vitest

---

## Testing Guidelines

### General Rules

- Do not rewrite existing tests unless explicitly requested
- Prefer extending coverage over replacing tests
- Avoid unnecessary mocks - test real implementations when possible
- No commented-out tests
- Use descriptive test names that explain the behavior being tested
- Test edge cases and error conditions

### Frontend (`@klurigo/klurigo-web`)

- **Framework**: Vitest + Testing Library + jsdom
- **Patterns**: Component testing with user interactions
- **Mocking**: Avoid mocking SCSS or React internals unless required
- **Coverage**: Aim for high coverage of component logic and user flows
- **E2E**: Playwright for critical user journeys

### Backend (`@klurigo/klurigo-service`)

- **Framework**: Jest with supertest for HTTP endpoints
- **Patterns**: Unit tests for utilities, integration tests for services
- **Mocking**: Mock external services, use real database for integration tests
- **Coverage**: Include controller, service, and repository logic

### Common (`@klurigo/common`)

- **Framework**: Vitest
- **Patterns**: Pure function testing with comprehensive edge case coverage
- **Mocking**: Minimal - test pure logic directly
- **Examples**: Array utilities, validation functions, type guards

---

## Git and CI Expectations

- **Commits**: Each logical change should be separate, focused, and reversible
- **Branching**: Feature branches from main, squash merges
- **CI**: Assumes root-level scripts work correctly
- **Security**: Never commit secrets, API keys, or sensitive configuration

Breaking any of the rules above may result in rejected changes or failing CI.
