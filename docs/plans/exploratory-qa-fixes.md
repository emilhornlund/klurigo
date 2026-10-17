# Exploratory QA Fixes — Implementation Plan

## Purpose and execution contract

Implement the 13 confirmed findings recorded in [`docs/qa/exploratory-testing.md`](../qa/exploratory-testing.md). This plan reflects current source inspection and names focused source/test targets. Implement each finding independently, preserve existing APIs and unrelated behavior, and retain each QA identifier in its implementation commit and regression coverage. The QA journal is historical reproduction evidence: do not edit or reinterpret its recorded evidence as part of implementation.

The final **Finding checklist** is the sole source of completion status: Pending means implementation is not complete; Implemented, verified, and committed means implementation, all required automated and browser/E2E verification, and the signed implementation commit have all succeeded. A blocked task remains pending; report its blocker and do not silently skip it or represent it as complete. Update that finding's checklist entry in the same signed implementation commit. Do not mark a task complete merely because code changed.

### Global implementation constraints

- For QA-001, QA-002, QA-004, and QA-005, supply accessible names only through `aria-label` or an equivalent non-visible mechanism supported by existing components. Do not add visible labels, UI elements, tooltips, or layout changes for naming. Preserve icon-only appearance, size, and behavior, as well as existing visible desktop labels. Verify accessible names in the browser accessibility tree and verify visual appearance remains unchanged.
- For QA-010, add the semantic main landmark while preserving the existing visual structure, classes, wrappers, layout, and behavior.
- Keep every finding independently traceable. Shared files do not justify combining fixes or checklist entries.
- All local investigation and testing must use synthetic/test data. Never inspect, create, modify, or delete imported production records. Before any E2E setup or run, verify that service configuration targets the isolated test MongoDB database containing `_test` (currently `klurigo_service_test`) and Redis logical DB 1, not development DB `klurigo_service` / Redis DB 0. If this cannot be verified, do not run setup/teardown or E2E; leave affected finding unchecked and report the blocker.
- Run `yarn validate` after the complete implementation set and before final PR creation. Final PR creation must not proceed unless full validation succeeds; if blocked/failing, report it and leave affected completion status unchecked.

## Current-code verification and suggested order

| Order | Finding | Current implementation confirmed                                                                                           | Priority / dependency                                                                              |
| ----- | ------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1     | QA-001  | `NicknameTextField` renders the refresh-icon `Button` without a label.                                                     | P2; standalone shared component.                                                                   |
| 2     | QA-002  | `QuizTableFilter` search and filter icon buttons have no accessible names.                                                 | P2; standalone shared component.                                                                   |
| 3     | QA-004  | `QuizEditorHeader` hides five toolbar labels on mobile without accessible names.                                           | P2; share responsive browser pass with QA-008, but keep fix/task separate.                         |
| 4     | QA-005  | `NicknameChip` delete icon button has no name; host Players modal exposes it.                                              | P2; shared component, verify context-sensitive label.                                              |
| 5     | QA-010  | Shared `Page` wraps primary content in divs, not a main landmark.                                                          | P2; broad shared-shell impact; verify all shell layouts.                                           |
| 6     | QA-011  | `index.html` disables user scaling using viewport constraints.                                                             | P2; global change, standalone.                                                                     |
| 7     | QA-003  | Both question media URL decorators use default `IsUrl` options; local upload URLs fail DTO validation.                     | P2; service validation and client upload/save flow. Resolve URL policy before changing validators. |
| 8     | QA-006  | Shared numeric `TextField` parses number input with `parseInt`; Zero-to-100 DTO currently allows decimals.                 | P2; enforce integer rule only for Zero-to-100, protect other numeric consumers.                    |
| 9     | QA-007  | OAuth callback calls `notifyError` immediately before route navigation.                                                    | P2; notification lifetime/route transition is the likely cause; test mounted app behavior.         |
| 10    | QA-009  | Automatic refresh path in `api-client-core` throws response error without the notification used by `AuthResource.refresh`. | P2; shared auth request path; avoid duplicate/stale notifications.                                 |
| 11    | QA-013  | `game.resource.joinGame` maps every rejection to an invalid-code message despite service 409 duplicate-nickname exception. | P2; API error-shape/status mapping; preserve unknown-error fallback.                               |
| 12    | QA-012  | Editor uses React Router `useBlocker` for in-app transitions but has no unsaved-state `beforeunload` warning.              | P2; distinct from in-app Exit confirmation; browser reload requires browser-level test.            |
| 13    | QA-008  | At 769px editor header action group exceeds viewport; Page header is a non-wrapping flex row.                              | P2; coordinate responsive verification with QA-004; no dependency on label fix.                    |

All findings are currently confirmed by the journal's browser evidence and the cited implementation was present during this repository review. Root-cause confidence is **high** unless a task explicitly says otherwise. Resolve the specific investigation notes in QA-003, QA-007, QA-009, and QA-013 within their scoped tasks; do not widen scope while doing so.

## Independently implementable tasks

### QA-001 — Name the nickname-generation button

- **Journal evidence:** `docs/qa/exploratory-testing.md`, QA-001, lines 580–602 (registration form has unnamed refresh icon; click generates a nickname).
- **Root cause / confidence:** `components/NicknameTextField/NicknameTextField.tsx` renders the icon-only button without `aria-label` or equivalent accessible text. High.
- **Implementation scope:** Add a concise non-visible accessible name such as “Generate nickname” to `shuffle-nickname-button` using `aria-label` or an equivalent supported by `Button`. Do not add visible labels, tooltips, other UI, or layout changes. Preserve the icon-only appearance, sizing, behavior, and any existing visible desktop labels. Check shared usages without expanding scope.
- **Regression tests:** Extend `src/components/NicknameTextField/NicknameTextField.test.tsx` to assert the button's accessible name and that activating it still changes the value through the supplied `onChange`.
- **Browser/E2E:** At `/auth/register`, verify the accessible name in the browser accessibility tree and exercise shuffle. Compare rendered appearance to confirm the existing icon-only appearance and sizing are unchanged.
- **Acceptance criteria:** Accessibility tree exposes the named button; click still generates a nickname; visual appearance is unchanged and no visible label/tooltip/UI was added.
- **Risks / constraints:** Keep the accessible name localized consistently with the app's current English UI; do not expose the decorative icon itself as the name.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/components/NicknameTextField/NicknameTextField.test.tsx`; `yarn workspace @klurigo/klurigo-web typecheck`; browser check per `docs/development/browser-verification.md`.

### QA-002 — Name discovery search and filter actions

- **Journal evidence:** QA-002, lines 102–128 (accessibility tree showed two bare buttons; search and dialog actions work).
- **Root cause / confidence:** `components/QuizTableFilter/QuizTableFilter.tsx` renders icon-only search/filter buttons without accessible names. High.
- **Implementation scope:** Add action-specific non-visible accessible names (e.g. “Search quizzes”, “Open filters”) using `aria-label` or an equivalent supported by existing components. Do not add visible labels, tooltips, UI, or layout changes. Preserve icon-only appearance, size, behavior, IDs, and any existing visible desktop labels. Check reuse contexts without expanding scope.
- **Regression tests:** Extend `src/components/QuizTableFilter/QuizTableFilter.test.tsx` to assert names and ensure search submission/filter dialog opening still work.
- **Browser/E2E:** On authenticated `/discover`, verify both names in the browser accessibility tree and exercise search and filter; compare rendered appearance to confirm no visual/layout change.
- **Acceptance criteria:** Each control has an unambiguous accessible name and retains behavior; icon-only appearance, sizing, and visible desktop labels are unchanged, with no added UI or layout changes.
- **Risks / constraints:** Do not make the names dependent on icon-only visual content or break existing accessible input labeling.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/components/QuizTableFilter/QuizTableFilter.test.tsx`; `yarn workspace @klurigo/klurigo-web typecheck`; browser check.

### QA-004 — Name the mobile quiz-editor toolbar actions

- **Journal evidence:** QA-004, lines 172–193 (at 390×844 Settings, Visual/Code, Save, Preview, Exit are exposed as unnamed buttons).
- **Root cause / confidence:** `pages/QuizCreatorPage/.../QuizEditorHeader/QuizEditorHeader.tsx` hides button value text at the mobile breakpoint but supplies no accessible label. High.
- **Implementation scope:** Give all five toolbar actions non-visible accessible names using `aria-label` or an equivalent mechanism supported by existing components, consistent with their actions and visible desktop text. Do not add visible labels, tooltips, other UI, or layout changes. Preserve icon-only appearance and sizing on mobile, behavior, and existing visible desktop labels.
- **Regression tests:** Extend `src/pages/QuizCreatorPage/components/QuizCreatorPageUI/components/QuizEditorHeader/QuizEditorHeader.test.tsx` to assert each named action at mobile and desktop rendering and retain key action callbacks.
- **Browser/E2E:** At 390×844, verify the five names in the browser accessibility tree, exercise actions, and compare the visual appearance with the existing icon-only layout. Inspect and preserve visible desktop labels.
- **Acceptance criteria:** All five controls have accessible names when mobile text is hidden; action behavior, icon-only appearance/sizing, desktop labels, and layout remain unchanged.
- **Risks / constraints:** Do not conflate “Visual/Code” toggle state with its action label; ensure names communicate the action/state clearly.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/pages/QuizCreatorPage/components/QuizCreatorPageUI/components/QuizEditorHeader/QuizEditorHeader.test.tsx`; `yarn workspace @klurigo/klurigo-web typecheck`; browser check at mobile and desktop.

### QA-005 — Name the host remove-player control

- **Journal evidence:** QA-005, lines 238–263 (hover reveals bare X button; it opens the expected confirmation and removes player).
- **Root cause / confidence:** Shared `components/NicknameChip/NicknameChip.tsx` renders an icon-only deletion button without a name; host uses it in `PlayerManagementModal.tsx`. High.
- **Implementation scope:** Add a descriptive non-visible accessible name to the remove action, preferably contextualized with the associated nickname when available, using `aria-label` or an equivalent supported by existing components. Do not add visible labels, tooltips, other UI, or layout changes. Preserve icon-only appearance, sizing, behavior, and existing visible labels; static non-removable chips remain unchanged.
- **Regression tests:** Extend `src/components/NicknameChip/NicknameChip.test.tsx` for named delete affordance and `src/states/common/HostGameFooter/components/PlayerManagementModal/PlayerManagementModal.test.tsx` (if present; otherwise create focused modal coverage) for the host-context label and confirmation flow.
- **Browser/E2E:** In a synthetic local host game, open Settings → Players, reveal the action, verify its name in the browser accessibility tree, and verify appearance remains unchanged. Exercise confirmation/removal only against the synthetic game.
- **Acceptance criteria:** Remove button has a non-visible accessible name and retains its existing confirmation/removal behavior; icon-only visual appearance and sizing are unchanged; non-removable chips expose no destructive action.
- **Risks / constraints:** Avoid a generic label that does not distinguish multiple player actions; consider accessible operation on touch/keyboard where hover currently reveals the control.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/components/NicknameChip/NicknameChip.test.tsx`; run modal-focused test; `yarn workspace @klurigo/klurigo-web typecheck`; synthetic browser flow.

### QA-010 — Add a primary-content main landmark

- **Journal evidence:** QA-010, lines 604–624 (Lighthouse `landmark-one-main` failure on Profile Games; shared Page shell content is div-wrapped).
- **Root cause / confidence:** `components/Page/Page.tsx` does not use `<main>` or `role="main"` for the primary content region. High.
- **Implementation scope:** Represent the shared primary page-content region as one semantic main landmark, preserving existing DOM visual structure as far as semantics allow, all classes/wrappers, layout, scroll behavior, and header/footer semantics. No visual redesign or unrelated markup change.
- **Regression tests:** Extend `src/components/Page/Page.test.tsx` to assert exactly one main landmark containing children for representative layouts; ensure optional header/footer stay outside the primary landmark as intended.
- **Browser/E2E:** Inspect authenticated `/profile/games` and a full-bleed page in the accessibility tree; run Lighthouse snapshot and confirm one main landmark without layout changes.
- **Acceptance criteria:** Each Page-rendered route exposes exactly one main landmark around primary content; no visible layout, scrolling, or header/footer regression.
- **Risks / constraints:** Some Page consumers may render nested page shells or custom landmark roles; search usages before implementation and ensure no nested/duplicate main landmarks.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/components/Page/Page.test.tsx`; `yarn workspace @klurigo/klurigo-web typecheck`; browser/Lighthouse snapshot.

### QA-011 — Restore mobile browser zoom

- **Journal evidence:** QA-011, lines 626–643 (viewport meta has `maximum-scale=1.0` and `user-scalable=no`; Lighthouse fails).
- **Root cause / confidence:** `packages/klurigo-web/index.html` explicitly disables scaling. High.
- **Implementation scope:** Remove zoom-disabling viewport directives while retaining `width=device-width`, `initial-scale=1.0`, and any supported `viewport-fit` behavior.
- **Regression tests:** Add/extend a focused static document assertion only if an appropriate test already exists; otherwise rely on build plus browser inspection rather than adding a brittle source-text test.
- **Browser/E2E:** Inspect the rendered mobile viewport meta tag and verify pinch zoom is enabled (browser/device emulation where supported); run Lighthouse accessibility audit and confirm `meta-viewport` passes.
- **Acceptance criteria:** Page allows user scaling at practical magnification; viewport still fits device width and application layout remains usable at 390×844.
- **Risks / constraints:** Do not reintroduce a maximum-scale or user-scalable restriction indirectly; inspect scaled UI for clipping.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web build:app`; `yarn workspace @klurigo/klurigo-web typecheck`; mobile browser/Lighthouse check.

### QA-003 — Accept local uploaded media URLs in quiz DTOs

- **Journal evidence:** QA-003, lines 130–170 and Cycle 9, lines 345–352 (photo upload 201 and image GET 200, but Pin and ordinary media quiz updates return 400 on `IsUrl`).
- **Root cause / confidence:** Both `api-question-pin-image-url-property.decorator.ts` and `api-question-media-url-property.decorator.ts` apply default `IsUrl` validation, which rejects the locally configured `localhost` URL accepted by the upload flow. High for mismatch; exact narrowest validation option should be confirmed against validator version and URL construction.
- **Implementation scope:** Align validation of question image/media URLs with the URLs emitted by the supported local upload flow. Prefer narrowly allowing valid local HTTP(S) hosts (including localhost) without weakening schemes/format checks for arbitrary inputs. Do not change upload APIs or silently allow unsafe protocols. Check cover-image decorator separately but expand scope only if the same demonstrated flow requires it.
- **Regression tests:** Extend `packages/klurigo-service/src/modules/quiz-api/controllers/models/quiz.request.spec.ts` with DTO validation cases for both question Pin image and ordinary media fields: local upload URL accepted; valid remote HTTP(S) accepted; malformed URL and unsupported scheme rejected. Extend `packages/klurigo-service/src/modules/quiz-api/controllers/quiz.controller.e2e-spec.ts` to verify a quiz update containing each local media field succeeds and malformed/unsupported URLs fail validation. Keep Pin and ordinary media assertions distinct.
- **Browser/E2E:** With synthetic local quiz, upload image, attach once to Pin and once to a standard question, save each, reload editor, and confirm media persisted/loads locally. Do not use imported quizzes.
- **Acceptance criteria:** Server accepts supported local upload URLs for both question media fields and persists them; malformed/non-HTTP URLs remain rejected; existing remote URL handling remains intact.
- **Risks / constraints:** Avoid blanket `IsUrl` removal or `require_tld: false` without proving behavior; local URL policy must remain limited to expected host/scheme. Keep orphan upload cleanup out of scope.
- **Verification commands:** `yarn workspace @klurigo/klurigo-service test:unit -- src/modules/quiz-api/controllers/models/quiz.request.spec.ts`; with verified test DB/Redis only, `yarn workspace @klurigo/klurigo-service test:e2e -- src/modules/quiz-api/controllers/quiz.controller.e2e-spec.ts`; `yarn workspace @klurigo/klurigo-service typecheck`; synthetic browser save flow.

### QA-006 — Enforce whole-number Zero-to-100 answers

- **Journal evidence:** QA-006, lines 265–302 (typing 25.5 into Zero-to-100 answer becomes 25 on blur; service DTO currently accepts decimals). The journal is historical and remains unchanged; implementation must enforce the corrected whole-number product rule below.
- **Root cause / confidence:** `components/TextField/TextField.tsx` currently applies `parseInt` to every number input, silently truncating fractions, while `question-zero-to-one-hundred-range.ts` validates only numeric range and accepts decimals. High.
- **Implementation scope:** Enforce integer values from 0 through 100 inclusive for Zero-to-100 correct answers in both frontend validation and backend DTO validation. Accept 0, 25, and 100. Reject `25.5` without truncating or rounding it, show clear validation feedback, and prevent invalid values from being saved. Inspect every shared `TextField` number consumer before changing parsing; do not globally alter unrelated numeric fields that legitimately support decimals. Use field-specific validation/props where needed so other numeric fields retain their current decimal behavior.
- **Regression tests:** Extend `components/TextField/Textfield.test.tsx` only for any shared parser/validation behavior actually changed, covering integer and decimal consumer behavior. Add Zero-to-100 editor unit coverage (extend `pages/QuizCreatorPage/components/QuizCreatorPageUI/components/QuestionSettings/QuestionSettings.test.tsx` or the relevant question datasource suite) for 0, 25, 100, fractional rejection/message, and disabled/prevented save while invalid. Add a focused backend model/DTO unit suite at `packages/klurigo-service/src/modules/quiz-api/controllers/models/question-zero-to-one-hundred-range.spec.ts` verifying 0/25/100 accepted and 25.5, values below 0, and values above 100 rejected. Add/update API integration coverage in `packages/klurigo-service/src/modules/quiz-api/controllers/quiz.controller.e2e-spec.ts`: valid boundary/interior integer update succeeds and fractional/out-of-range update returns validation failure without persisting invalid data.
- **Browser/E2E:** In a synthetic Zero-to-100 quiz, verify 0, 25, and 100 are accepted; entering 25.5 gives clear validation and is neither changed to 25 nor rounded; Save is disabled or submission is otherwise blocked; invalid API submission is rejected. Save valid integers and reload to verify persistence. Use only synthetic records.
- **Acceptance criteria:** Zero-to-100 correct answer accepts whole integers 0–100 inclusive in frontend and backend; fractional and out-of-range values are clearly rejected and cannot be saved; no silent truncation or rounding; unrelated decimal-capable fields continue to accept their existing decimal values.
- **Risks / constraints:** `TextField` is shared. Audit all numeric consumers and avoid global integer-only behavior. Do not rely solely on HTML `step=1`; backend DTO must independently reject decimals. Never persist an invalid value in integration tests.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/components/TextField/Textfield.test.tsx src/pages/QuizCreatorPage/components/QuizCreatorPageUI/components/QuestionSettings/QuestionSettings.test.tsx`; `yarn workspace @klurigo/klurigo-service test:unit -- src/modules/quiz-api/controllers/models/question-zero-to-one-hundred-range.spec.ts`; with verified test DB/Redis only, `yarn workspace @klurigo/klurigo-service test:e2e -- src/modules/quiz-api/controllers/quiz.controller.e2e-spec.ts`; web and service typecheck; synthetic browser flow.

### QA-007 — Preserve OAuth callback failure feedback across navigation

- **Journal evidence:** QA-007, lines 313–343 (callback error path called `notifyError`, then Login appeared with empty notification region on two repetitions).
- **Root cause / confidence:** `AuthGoogleCallbackPage.tsx` issues a transient toast immediately before navigating to Login; navigation/route lifecycle clears or prevents it from being rendered. High for timing/lifetime, medium for exact toast teardown mechanism; inspect notification provider and route mounting before choosing implementation.
- **Implementation scope:** Ensure the callback error message survives the redirect and is visible on Login, using the existing notification mechanism/pattern (e.g. navigation state or deferred display). Preserve generic wording and avoid query-string leakage or changing successful OAuth handling.
- **Regression tests:** Extend `src/pages/AuthGoogleCallbackPage/AuthGoogleCallbackPage.test.tsx` for denial/error navigation and visible notification after destination render; cover successful callback path unchanged. Inspect notification-related tests if using a shared mechanism.
- **Browser/E2E:** In clean logged-out local context navigate to synthetic `access_denied` callback URL; verify Login shows error in live region after redirect; verify no external provider requests and no stale message after a later normal login.
- **Acceptance criteria:** Callback error produces one visible, accessible error after Login renders; success flow is unchanged; no duplicate or stale toast.
- **Risks / constraints:** Keep callback errors local and generic; notification scheduling must not race a subsequent route or disappear on redirect.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/pages/AuthGoogleCallbackPage/AuthGoogleCallbackPage.test.tsx`; `yarn workspace @klurigo/klurigo-web typecheck`; local browser callback check.

### QA-009 — Notify promptly when automatic session refresh fails

- **Journal evidence:** QA-009, lines 417–454 (refresh request 400, route returns public home silently; stale error appeared after later successful login).
- **Root cause / confidence:** `api/api-client-core.ts` automatic refresh implementation fetches refresh directly and throws parsed HTTP errors without notifying; `AuthResource.refresh` has separate notification behavior that this path bypasses. High.
- **Implementation scope:** Route automatic refresh failures through one timely generic notification and the existing unauthenticated recovery path. Avoid duplicated notifications for errors already handled at resource level, stale delayed toasts, or changing successful token refresh/retry behavior. Inspect all refresh call sites and request scopes.
- **Regression tests:** Extend `src/api/api-client-core.test.ts` for invalid/expired refresh error notification exactly once and successful refresh with no error; inspect `src/api/resources/auth.resource.test.ts` and context tests for duplicate-notification interaction.
- **Browser/E2E:** Use synthetic browser session with expired access token and invalid synthetic refresh token; request protected page; verify public recovery plus visible notification promptly. Then sign in validly and verify no stale refresh error appears. Never use real credentials/tokens.
- **Acceptance criteria:** Failed automatic refresh produces a visible generic message at failure time, clears/revokes invalid session as current recovery requires, and does not surface later; successful refresh remains authenticated and unannounced.
- **Risks / constraints:** Multiple API calls may race through refresh; ensure one meaningful message and prevent repeated notifications while preserving refresh coalescing/retry logic.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/api/api-client-core.test.ts`; `yarn workspace @klurigo/klurigo-web test:unit -- src/api/resources/auth.resource.test.ts src/context/auth/AuthContextProvider.test.tsx`; typecheck; synthetic browser refresh flow.

### QA-013 — Explain duplicate-nickname join conflicts

- **Journal evidence:** QA-013, lines 493–525 (duplicate join HTTP 409 receives invalid-code message; unique nickname retry to same game succeeds).
- **Root cause / confidence:** `api/resources/game.resource.ts` catches every `joinGame` rejection and emits the invalid-code message; backend defines `NicknameNotUniqueException` for the 409 case. High. Confirm response body/error representation from shared API client before mapping.
- **Implementation scope:** Distinguish duplicate nickname conflict in `joinGame` and show actionable “nickname already in use” feedback; retain the current generic game-code fallback for unrelated errors and keep the join page retryable. No API contract change unless current error response lacks reliable discriminator; if so investigate exception serialization first.
- **Regression tests:** Extend `src/api/resources/game.resource.test.ts` for duplicate-name 409 mapping, generic failure fallback, and successful join; extend `src/pages/GameJoinPage/GameJoinPage.test.tsx` if needed to verify retry remains possible.
- **Browser/E2E:** Run synthetic game with two sessions; duplicate nickname shows actionable error and preserves PIN/form; unique retry joins. If backend e2e added, target a focused game join test and use test DB only.
- **Acceptance criteria:** Duplicate nickname failure is identified as such; wrong/unknown code and unexpected failures preserve safe generic messaging; user can retry with a different nickname.
- **Risks / constraints:** Do not infer duplicate solely from all HTTP 409 responses unless every 409 in this endpoint has that meaning; preserve service/API behavior.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/api/resources/game.resource.test.ts src/pages/GameJoinPage/GameJoinPage.test.tsx`; `yarn workspace @klurigo/klurigo-web typecheck`; synthetic browser flow; backend test only if response-contract change is necessary.

### QA-012 — Warn before unloading editor with unsaved changes

- **Journal evidence:** QA-012, lines 475–482 and 645–667 (unsaved question edit lost on browser reload without prompt; in-app Exit already warns).
- **Root cause / confidence:** `pages/QuizCreatorPage/QuizCreatorPage.tsx` uses React Router `useBlocker` for client-side navigation but registers no `beforeunload` handler for reload/close. High.
- **Implementation scope:** Register a browser `beforeunload` warning only while editor state is dirty; remove/disable it after successful save or discard/unmount. Reuse existing dirty-state source and preserve the in-app Exit confirmation; do not attempt to set custom browser dialog text.
- **Regression tests:** Extend `src/pages/QuizCreatorPage/QuizCreatorPage.test.tsx` for dirty/clean listener behavior and save/discard cleanup; keep existing `UnsavedChangesExitModal` tests intact. Mock/dispatch beforeunload in a way matching browser default-prevention semantics.
- **Browser/E2E:** In editor change a saved quiz field without saving, reload and confirm native browser warning; cancel reload and verify edits remain. Save or discard then reload and confirm no prompt. Browser dialogs may need Playwright dialog handling.
- **Acceptance criteria:** Dirty editor raises the browser's standard unload confirmation; clean/saved editor does not; canceled unload preserves edits; existing in-app navigation warning still works.
- **Risks / constraints:** Modern browsers ignore custom text and require `preventDefault`/`returnValue`; register only while dirty; prevent listener leaks and avoid blocking reload after successful save.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/pages/QuizCreatorPage/QuizCreatorPage.test.tsx src/pages/QuizCreatorPage/components/UnsavedChangesExitModal/UnsavedChangesExitModal.test.tsx`; typecheck; Playwright/browser reload check.

### QA-008 — Keep quiz-editor toolbar within tablet viewport

- **Journal evidence:** QA-008, lines 354–385 (at 769px Exit bounds extend to x≈807, clipped with no horizontal document scroll; 1440 and 390 fit).
- **Root cause / confidence:** Header title input plus all toolbar actions are kept in one row; `components/Page/Page.module.scss` header is a non-wrapping flex row. High.
- **Implementation scope:** Adjust the editor header's responsive sizing/wrapping/compact layout at the constrained tablet breakpoint so every action remains fully visible and reachable. Prefer a localized header treatment over changing global Page geometry. Coordinate the check with QA-004 but do not depend on its accessible-label change.
- **Regression tests:** Extend `src/pages/QuizCreatorPage/components/QuizCreatorPageUI/components/QuizEditorHeader/QuizEditorHeader.test.tsx` with responsive class/structure assertions if consistent with test style; use browser geometry as authoritative visual check.
- **Browser/E2E:** Inspect 768×1024, 769×1024, 800×1024, 900×900, 390×844, and 1440×900. Assert Exit bounding box stays within viewport and is fully clickable; verify title and all actions remain usable with no horizontal page overflow.
- **Acceptance criteria:** At affected tablet widths every toolbar control is entirely visible, keyboard reachable, and operable; no clipping or document-wide horizontal overflow; mobile and desktop remain correct.
- **Risks / constraints:** The 768/769 breakpoint behavior is unusual; do not fix only one sampled pixel width or reduce controls below usable size. Ensure layout works with long quiz titles and mobile hidden labels.
- **Verification commands:** `yarn workspace @klurigo/klurigo-web test:unit -- src/pages/QuizCreatorPage/components/QuizCreatorPageUI/components/QuizEditorHeader/QuizEditorHeader.test.tsx`; `yarn workspace @klurigo/klurigo-web typecheck`; browser responsive check at listed sizes.

## Cross-task dependencies and verification notes

- No task is a prerequisite for another. QA-004 and QA-008 touch the same editor header and should be inspected together, but remain separate commits/checklist entries so labels and geometry are independently traceable.
- QA-001 and QA-005 both use shared nickname UI, but affect different controls (`NicknameTextField` generator versus `NicknameChip` remove). Do not merge test assertions or mark one finding resolved by the other's change.
- QA-010 changes a global shell and should receive broad route/layout inspection; QA-011 changes global mobile viewport behavior and should be checked at constrained mobile zoom. Neither depends on the other.
- QA-003 changes server-side URL validation; QA-006 enforces the Zero-to-100 integer contract in frontend and backend. They affect separate payload fields and can be implemented independently. QA-003 must keep the URL scheme/host policy constrained; QA-006 must not impose integer-only behavior on unrelated decimal-capable fields.
- QA-007 and QA-009 both concern error notifications around navigation/authentication, but have distinct sources and regressions. Test against duplicate/stale toasts independently.
- QA-013 should only map a reliably identifiable nickname-duplicate error; verify the actual API error payload/status rather than translating every conflict or failure.
- Run browser checks with synthetic/local data only. Frontend Playwright and backend e2e suites reset shared test databases; use them only against the configured `_test` database/Redis DB 1 after confirming environment. Do not run against development data.

### Investigation to resolve within implementation tasks

- **QA-003:** Confirm the exact URL emitted by local upload and class-validator's behavior for that host; choose the narrowest policy that accepts supported local HTTP(S) uploads while rejecting malformed URLs and unsupported schemes. No scope expansion to cover images unless evidence shows the same local URL rejection.
- **QA-007:** Inspect notification provider/toast mounting across callback-to-login navigation to select a durable existing pattern; keep successful OAuth callback behavior unchanged.
- **QA-009:** Trace all automatic and explicit refresh callers and concurrent request behavior before adding notification, so a single failure is surfaced once and cannot appear stale later.
- **QA-013:** Inspect serialized service exception response and frontend `ApiError` shape to identify duplicate nickname specifically. If no reliable discriminator is present, pause before changing the API contract and document the smallest compatible contract change for review.

## Project verification commands

Run focused tests named by each task first. Repository scripts confirmed in root and workspace `package.json` files:

```sh
# Frontend or backend focused unit suite(s): append the relevant path(s) shown in the task.
yarn workspace @klurigo/klurigo-web test:unit -- <web-test-file-or-files>
yarn workspace @klurigo/klurigo-service test:unit -- <service-test-file-or-files>

# Per-task or aggregate static checks
yarn workspace @klurigo/klurigo-web typecheck
yarn workspace @klurigo/klurigo-service typecheck
yarn validate

# Browser integration, only with test services and safe test DB configuration
docker compose up -d --wait mongodb redis
yarn workspace @klurigo/klurigo-web test:e2e
yarn workspace @klurigo/klurigo-service test:e2e
```

`yarn validate` runs build, typecheck, lint, format check, circular-dependency check, and all workspace unit tests. Do not run e2e commands unless test database configuration is verified: repository e2e setup resets its configured test stores. Frontend UI tasks also require the task-specific Chrome DevTools/browser inspection described above; unit tests and `yarn validate` do not replace it.

## Finding checklist

- [x] QA-001 — Nickname shuffle control is named; implemented, verified, and committed.
- [x] QA-002 — Search and filter actions are named; unit, browser, and discovery E2E verified; committed.
- [ ] QA-003 — Uploaded question media fails quiz-save URL validation.
- [ ] QA-004 — Mobile quiz-editor toolbar actions are unnamed.
- [ ] QA-005 — Host remove-player control is unnamed.
- [ ] QA-006 — Zero-to-100 answers must be whole integers from 0 through 100.
- [ ] QA-007 — OAuth callback error feedback disappears after redirect.
- [ ] QA-008 — Quiz-editor toolbar clips at tablet widths.
- [ ] QA-009 — Automatic refresh failure feedback is delayed.
- [ ] QA-010 — Application pages lack a main landmark.
- [ ] QA-011 — Mobile viewport disables user zoom.
- [ ] QA-012 — Editor reload discards unsaved changes without warning.
- [ ] QA-013 — Duplicate nickname conflict is reported as invalid game code.
