# Browser Verification

Use Chrome DevTools MCP to inspect frontend changes in a running browser before completing tasks that affect the UI.

Browser verification supplements the automated validation described in [Development Commands](commands.md).

## Available Tools

Chrome DevTools MCP provides browser capabilities including:

- Opening pages and navigating between routes.
- Inspecting rendered page structure and accessibility information.
- Capturing screenshots.
- Changing viewport dimensions.
- Clicking controls, entering text, and exercising interactions.
- Inspecting JavaScript errors and network requests.

Use these tools to evaluate actual application behavior and appearance. Do not infer visual correctness from source code
alone.

## Starting the Application

Run commands from the repository root inside the active task worktree.

The default development ports are:

| Application | Address                 |
| ----------- | ----------------------- |
| Frontend    | `http://localhost:3000` |
| Backend     | `http://localhost:8080` |
| Storybook   | `http://localhost:6006` |

### Full Application

Start the backend and frontend using:

```sh
yarn dev
```

This starts the NestJS backend and waits for backend readiness before starting the Vite frontend.

The backend requires MongoDB and Redis. In the Agent Orchestrator container, use the dedicated test services provided by
the infrastructure stack through the configured `MONGODB_HOST`, `MONGODB_PORT`, `REDIS_HOST`, and `REDIS_PORT`
environment variables.

Never start a second development server on a port already occupied by another task. Check port availability before
starting the application.

For full application verification, wait until the frontend is accessible at
`http://localhost:3000` and the backend readiness endpoint responds successfully
at `http://localhost:8080/health/ready`.

For isolated Storybook verification, only the Storybook server needs to be
available.

### Isolated Component Inspection

For components that can be rendered independently, start Storybook:

```sh
yarn workspace @klurigo/klurigo-web storybook
```

Open `http://localhost:6006` using Chrome DevTools MCP.

Storybook is appropriate for examining component appearance, variants, interaction states, and responsiveness without
navigating through the application.

Storybook verification does not replace application-level verification when a change affects routing, authentication,
API integration, or complete user flows.

## Browser Verification Workflow

### 1. Open the Affected UI

Use Chrome DevTools MCP to navigate to the affected application route or Storybook story.

Confirm that the expected component is present and rendered.

If a route requires authentication or application state, establish that state using supported development or test
workflows.

Do not bypass authentication or alter production data to reach a page.

### 2. Inspect the Rendered UI

Capture screenshots and inspect the rendered page structure.

Evaluate:

- Layout and alignment.
- Spacing and visual hierarchy.
- Typography and readability.
- Component sizes and positioning.
- Colors and established design tokens.
- Overflow, clipping, and overlapping elements.
- Visibility and reachability of interactive controls.
- Consistency with existing Klurigo components.

Do not assume an implementation is visually correct merely because the application compiles successfully.

### 3. Verify Responsive Behavior

Inspect relevant viewport sizes, including:

- Desktop: 1440 × 900.
- Tablet: 768 × 1024.
- Mobile: 390 × 844.

These are representative inspection sizes, not replacements for testing the layout's actual breakpoints.

Include additional viewport sizes when the affected UI has known constraints or responsive transitions.

### 4. Exercise Interactions

Interact with the affected controls where applicable.

Verify:

- Navigation and routing.
- Buttons and actions.
- Form inputs and validation feedback.
- Dialogs, menus, and overlays.
- Loading, empty, error, and success states.
- Keyboard interaction where relevant.
- Controls remain visible and reachable on constrained viewports.

Check the browser console for relevant errors and inspect failed network requests.

### 5. Correct and Reverify

If visual or functional issues are found:

1. Identify the cause in the relevant components or styles.
2. Make a focused correction.
3. Reload or revisit the affected UI.
4. Repeat the relevant visual and interaction checks.
5. Confirm that the original issue is resolved without introducing regressions.

Do not stop after the first successful render if the affected UI still contains observable defects.

### 6. Run Automated Validation

Run the relevant repository validation commands and automated tests.

Use the documented commands in [Development Commands](commands.md).

Do not substitute Chrome DevTools MCP inspection for Playwright end-to-end tests.

The Playwright suite manages its own application servers and test database lifecycle. Stop conflicting development
servers before running it, and do not perform concurrent browser inspection against a database being reset by test setup
or teardown.

### 7. Clean Up

Stop development servers started specifically for browser verification.

Do not terminate servers belonging to another task or agent session.

Do not commit temporary screenshots, browser profiles, session data, or debugging artifacts.

## Reporting

When completing a frontend task, report:

- Which pages or components were inspected.
- Which viewport sizes were verified.
- Which interactions were tested.
- Whether relevant console errors or network failures were observed.
- Which visual or functional issues were corrected.
- Any verification that could not be completed and why.

Only report checks that were actually performed.
