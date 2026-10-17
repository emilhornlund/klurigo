# Klurigo Exploratory QA — Round 2

Living record for the second exploratory browser campaign. Findings here start
at QA-014; QA-001 through QA-013 remain in the original journal.

## Environment and safety

- Repository commit: `4364d3591737494fb2fa166eea5cde44d72045a0` — merged PR #739
  (`Fix confirmed exploratory QA findings (#739)`), same commit as `origin/main`.
- The working tree was clean before testing. The checked-in development
  configuration pointed to MongoDB `localhost:27017` database
  `klurigo_service` and Redis `localhost:6379` logical DB `0`. These are local
  development targets and are treated as containing imported production data;
  no database reset, direct database inspection, or imported-record mutation was
  performed. Docker CLI was unavailable, but local MongoDB and Redis host ports
  were listening.
- Started the local application with `EMAIL_ENABLED=false yarn dev`. Frontend
  `http://localhost:3000/` and backend readiness endpoint
  `http://localhost:8080/health/ready` returned HTTP 200. Email delivery was
  disabled; no SMTP, OAuth provider, or other external production service was
  contacted.
- Used newly created synthetic accounts and one private synthetic Classic quiz.
  The private quiz contained six question types and one local test-image upload.
  An isolated anonymous synthetic player joined the test game. Identifiers,
  tokens, PINs, names, and upload paths are omitted below.

## Exploration cycles

### Confirmed findings to date

- **QA-014 — P2:** Results route redirects home during successful access-token
  refresh.
- **QA-015 — P2:** Pin answer target is inaccessible to keyboard and assistive
  technology.
- **QA-016 — P2:** Expired user token breaks the two-step game-host flow and
  produces a misleading invalid-code message.
- **QA-017 — P2:** Range number input and slider can display different answers
  for values off the generated slider step.

### Cycle 1 — clean account, quiz editing, media, and all Classic types

- Registered a new `.test` synthetic account through the local UI. Registration
  succeeded and chained into authenticated home. The previously reported
  nickname-generation accessible name is now exposed as “Generate nickname”.
- Created a Classic quiz with Multiple Choice, Range, Type Answer, Pin, Puzzle,
  and True/False questions. Completed content in each editor; Type Answer allowed
  multiple accepted responses. The Range editor accepted custom minimum/maximum,
  target, and margin values; the displayed acceptance interval updated after
  entering the values with normal select-all/type interactions.
- Uploaded the repository’s synthetic test image for the Pin question. Upload
  completed, image loaded locally, quiz save returned success, and all six
  questions plus the local image survived editor reload. Changed the quiz from
  its default Public visibility to Private and verified that state on its
  details page.
- Previewed Multiple Choice, Range, and Type Answer. A case-variant response
  surrounded by whitespace advanced through the Type Answer preview. Puzzle
  keyboard dragging moved an item; preview timer elapsed before the full
  correction could be completed. Pointer drag helper reported a drop over the
  source item and did not change order, so live pointer sorting remains
  inconclusive.
- Browser console emitted React “Cannot update a component while rendering a
  different component” errors from normal Multiple Choice and Type Answer
  editor renders/edits. The saved quiz reloaded with all content intact; no
  user-visible corruption was established. Retained as an unconfirmed runtime
  observation below.
- Local network evidence: synthetic account creation/login/profile requests
  returned 201/200; quiz create/update returned 201/200; local media upload
  returned 201. No failed API requests were observed in this cycle.

### Cycle 2 — two-session Classic multiplayer and interrupted progression

- Hosted the private synthetic six-question quiz and joined from an isolated
  anonymous browser context. Both host and player entered the same live
  question; host roster reflected the synthetic player.
- Submitted an incorrect Multiple Choice response. Player showed Incorrect and
  host response distribution updated. Reloading the player during the result
  preserved the same question result and score.
- Host advanced through Leaderboard to Range. Player could edit a slider/number
  response; answer timing expired while the browser interaction was in progress,
  and host/player consistently showed a timeout/incorrect result.
- Submitted a case-variant Type Answer response (“mArS”) in the live game. It
  scored correct and appeared in host results. Pin image rendered at the
  500-CSS-pixel mobile-width browser viewport. Puzzle shuffled its choices;
  keyboard focus/drag interaction was available, while the Chrome drag helper
  did not produce a pointer reorder. The Puzzle timer expired before the
  attempt completed. True/False correct response completed normally.
- Reloaded the host during the final question result; host remained on that
  question/result. Finished the game, opened full Results, and visited Summary,
  Players, and Questions. All tabs rendered and per-question outcomes matched
  the live game.
- SSE traffic included an aborted initial stream followed by a successful local
  event-stream request. Game creation returned 201 and task progression
  requests returned 204. No persistent transport/console error was observed.

### Cycle 3 — Results route with expired access token and valid refresh token

- On the synthetic host browser only, changed the locally stored access-token
  expiry timestamp to the past while leaving the refresh token valid. Reloaded
  the completed game Results route.
- Reproduced twice: browser ended on public home instead of Results. In both
  runs, local `POST /api/auth/refresh` returned 200 and local
  `GET /api/profile/user` returned 200; no Results API request was made before
  navigation away. The home page still displayed the authenticated Menu
  control, confirming the session recovered rather than being logged out.
- Direct navigation back to the same synthetic Results route with the refreshed
  session rendered Summary and all tabs normally. The expired access timestamp
  was generated only in this synthetic browser store; raw token values are not
  recorded.

#### QA-014 — Results route redirects home during successful access-token refresh

- **Severity:** P2 (a user with an otherwise recoverable session loses their
  current Results route and must navigate back to history/results).
- **Affected UI:** Authenticated routes on initial mount/reload; reproduced on
  `/game/results/:gameID`.
- **Reproduction:**
  1. Sign in to a synthetic local account and open a completed synthetic game’s
     Results page.
  2. In that browser’s local `auth` storage only, set the User ACCESS expiry to
     a past timestamp; retain the valid REFRESH token.
  3. Reload the Results page.
- **Expected:** Refresh the valid session, then render the requested Results
  route and its data.
- **Actual:** Route redirects to `/` before displaying Results, even though
  refresh and profile lookup both succeed. The authenticated menu is present on
  home. Manually reopening Results with the renewed session works.
- **Sanitized browser/network evidence:** Reproduced twice on a synthetic local
  Results route. `POST /api/auth/refresh` → 200 and `GET /api/profile/user` →
  200; no Results-data request was issued before the final home snapshot. No
  token, synthetic game ID, account identifier, or result details are required
  to reproduce.
- **Likely cause / source:** `packages/klurigo-web/src/components/ProtectedRoute/ProtectedRoute.tsx:41-58`
  redirects immediately when `isUserAuthenticated` is false.
  `packages/klurigo-web/src/context/auth/AuthContextProvider.tsx:112-132`
  derives that flag solely from the currently stored access-token expiry. During
  reload the guard can redirect before the successful refresh restores the
  authenticated state. `GameResultsPage.tsx:21-32` also navigates back on query
  error, but in this reproduction no Results request occurred.

### Cycle 4 — Pin question keyboard/accessibility interaction

- During the live Pin question, the player saw the prompt, a local synthetic
  image, a center pin, and “Submit My Pin”. Desktop and narrow browser renderings
  showed the image and pin visually. The pointer handler is present in source,
  but a non-center pointer reposition was not verified manually; submission of
  the default center position is verified in Cycle 7.
- The actual live-game accessibility snapshot exposed the prompt and Submit
  button, but not the Pin image/interactive target. Source inspection shows the
  Pin overlay receives only pointer handlers and has no keyboard role, focus
  target, or keyboard handlers. This reproduces a keyboard/screen-reader
  operation barrier, not merely a missing decorative image label.

#### QA-015 — Pin answer target is inaccessible to keyboard and assistive technology

- **Severity:** P2 (players relying on keyboard or screen readers cannot place
  their answer on Pin questions; the primary answer action is pointer-only).
- **Affected UI:** Live Classic Pin question, including the mobile player view.
- **Reproduction:**
  1. Join a local synthetic game containing a Pin question.
  2. Inspect the question with the accessibility tree and navigate interactive
     controls with Tab/keyboard.
  3. Attempt to move the answer pin without using a pointer.
- **Expected:** The image/answer target has an accessible name and keyboard
  interaction to place/move the pin, with the selected position conveyed to
  assistive technology.
- **Actual:** The accessibility tree exposes the question heading and submit
  button but no Pin image/answer control. The overlay is not focusable and its
  input handlers are `onPointerDown`, `onPointerMove`, `onPointerUp`, and
  `onPointerCancel` only. Keyboard users cannot alter the default center answer.
- **Sanitized evidence:** Live-player snapshot contained no image or focusable
  answer target between the Pin question heading and “Submit My Pin”. Screenshot
  confirmed a rendered image/pin; UI/source inspection confirmed pointer-only
  interaction. This requires no imported quiz or identifying game data.
- **Likely cause / source:**
  `packages/klurigo-web/src/components/PinImage/PinImage.tsx:260-280` renders a
  non-focusable `div` overlay with pointer events only. The live Pin wrapper at
  `packages/klurigo-web/src/states/common/QuestionAnswerPicker/components/AnswerPin/AnswerPin.tsx:74-98`
  does not provide an accessible alternative.

### Cycle 5 — multi-tab logout synchronization

- Opened the same synthetic account in two tabs within one isolated browser
  context. Both tabs rendered the completed Results page and authenticated
  navigation. Logging out in one tab redirected that tab to public home; the
  other tab reacted to the shared local-storage change and also returned to
  public home with the Login link visible.
- Cross-tab logout propagation worked in this controlled test. No stale
  authenticated controls remained in the second tab.

### Cycle 6 — synthetic account email change and verification recovery

- Opened Profile Settings for the synthetic author. The email field was editable
  and the unverified-email notice offered a resend-verification action. Changed
  the synthetic address to a second reserved `.test` address and saved; the
  profile API returned 200 and a reload showed the new address persisted.
- In a clean isolated browser context, login with the new, not-yet-verified
  address was rejected with the generic credentials message. Login with the
  previous address and same synthetic password succeeded. This is consistent
  with a pending email-verification transition; the local process had external
  mail disabled, so no verification link could be received or completed.
- Clicked the resend-verification control. Local
  `POST /api/auth/email/resend_verification` returned 204 and UI displayed its
  normal “email is on its way” confirmation. Because delivery was disabled and no
  local mail sink was configured, token generation/delivery/completion was not
  verified; this is not classified as a defect.
- Account data remains synthetic. No imported data was affected.

### Cycle 7 — long-timer Pin and Puzzle live answers

- Increased the synthetic Pin and Puzzle question timers to four minutes and
  saved them through the quiz editor. A fresh host/player game reached both
  questions without relying on the default short timer.
- Submitted the default center Pin in the live game. It scored Correct, advanced
  the player streak, and host response totals reflected the submission. This
  verifies the local uploaded image, saved Pin answer payload, backend scoring,
  and host/player synchronization. It does not remove QA-015: no keyboard path
  exists to choose a non-default coordinate.
- Puzzle started in a randomized order. Used the accessible keyboard drag
  controls (Space, ArrowUp, Space) to move Third relative to First, then moved
  Second above Third. The resulting `First, Second, Third` order submitted as
  Correct; score/streak and host state updated. Long timer separated tool latency
  from the interaction. Pointer-based sorting remains unverified because the
  browser drag helper dropped over the source item.
- The Round 2 Range question remained at its default short timer; the live answer
  attempt timed out during tool-driven slider entry. Range editor settings and
  preview slider were exercised, but live margin/boundary scoring remains open.

### Cycle 8 — long-timer Range gameplay and token-expiry host retry

- Set the synthetic Range question timer to four minutes, then hosted a fresh
  game and joined from the synthetic player context. Submitted the configured
  exact answer using the numeric field; player scored Correct and the host saw
  one submission. The `67` numeric answer was accepted against the configured
  target and margin.
- At the same time, observed a mismatch between the Range numeric field and
  slider thumb: after entering `67`, accessibility exposed spinbutton value 67
  and slider value 68. DOM inspection showed the range input has `step=2` while
  the number input has the default step and retained 67. The answer submission
  scored correct. This reproduced **QA-017** below.
- Later, after the synthetic author access token had expired naturally, tried
  hosting another local synthetic game. Quiz game creation returned HTTP 201,
  but follow-up `POST /api/auth/game` returned HTTP 401 “Invalid or expired
  token”; the host dialog stayed open and displayed the misleading “game code
  didn’t match” message. Retrying immediately after automatic refresh succeeded
  (`/api/quizzes/:id/games` 201 then `/api/auth/game` 200), leaving the first
  newly-created game without a successfully authenticated host. This reproduced
  **QA-016**.

#### QA-016 — Expired user token breaks the two-step game-host flow

- **Severity:** P2 (an expired user session makes the first host attempt fail
  after creating a game; the UI reports an invalid code and retry creates a
  second game).
- **Affected UI:** Starting a game from a quiz’s Host Game confirmation after
  User-scope access expiry.
- **Reproduction:**
  1. Sign in with a synthetic local account and open a synthetic quiz’s details.
  2. Let the User access token expire while its refresh token remains valid.
  3. Confirm **Host Game** once; note that a retry after the refresh completes
     succeeds.
- **Expected:** Refresh the User token before authenticating the newly-created
  game, then open the lobby with one host attempt and one created game.
- **Actual:** Game creation returns 201, then game authentication returns 401.
  The quiz details dialog remains visible and says the game code did not match.
  Retrying after refresh returns 201 + 200 and opens a second game.
- **Sanitized browser/network evidence:** Local
  `POST /api/quizzes/:quizId/games` → 201 followed by
  `POST /api/auth/game` → 401 `Invalid or expired token`; immediate confirmation
  retry → 201 then 200 and lobby. No raw token, quiz ID, game ID, or PIN is
  included. The user token was synthetic and had expired naturally; refresh
  returned 200 during the flow.
- **Likely cause / source:**
  `packages/klurigo-web/src/pages/QuizDetailsPage/QuizDetailsPage.tsx:65-72`
  creates a game and then calls `authenticateGame`. In
  `packages/klurigo-web/src/api/resources/auth.resource.ts:144-164`, the
  authenticate-game request explicitly sets `{ refresh: false }` when User auth
  exists, so the expired User token is not refreshed/retried. Its catch maps the
  auth failure to an invalid-game-code message. The successful retry after
  automatic refresh corroborates the expired-token cause.

#### QA-017 — Range number input and slider can show different answers

- **Severity:** P2 (players can submit a different number from the slider
  position displayed beside the number field).
- **Affected UI:** Live Classic Range response when the generated slider step is
  greater than one and the player enters an integer not aligned to that step.
- **Reproduction:**
  1. Play a synthetic Range question whose configured minimum/maximum result in
     slider step 2 (for example, the tested range 10–90).
  2. Focus the numeric answer field, select all, and type an off-step value such
     as `67`.
  3. Compare the numeric field and slider value before submitting.
- **Expected:** Both controls represent the same selected answer, or the number
  field clearly enforces the slider’s available step values.
- **Actual:** Number input retains 67 while the slider value/thumb snaps to 68.
  The player can submit and score using the numeric value even though the
  slider represents another value.
- **Sanitized evidence:** Live-player accessibility snapshot showed spinbutton
  value 67 and slider value 68. DOM properties showed range `step=2`, `min=10`,
  `max=90`, slider `value=68` with attribute value 67, and number input
  `value=67`. Submission was accepted and scored Correct against the configured
  target. No player/account/game identifiers are required.
- **Likely cause / source:**
  `packages/klurigo-web/src/states/common/QuestionAnswerPicker/components/AnswerRange/AnswerRange.tsx:82-103`
  binds the slider to `question.step` while the adjacent numeric `TextField`
  accepts an integer without that step constraint. The common
  `calculateRangeStep` policy deliberately uses coarse steps for wider ranges;
  HTML range sanitizes an off-step controlled value to its nearest step while
  numeric input keeps the exact integer.

## Unconfirmed observations

- **Editor React warning:** Editing/initializing Multiple Choice and Type Answer
  emitted React “Cannot update a component while rendering a different
  component” console errors. Saved values survived quiz save and full reload,
  but concurrent state/production effects were not tested. Reproduce on a
  minimal single-question editor and check whether subsequent answers or
  validation state become stale before treating as a user-visible defect.
- **Puzzle pointer reorder:** Chrome DevTools drag helper reported dropping on
  the source item and no change was visible. Long-timer keyboard sorting
  completed successfully and scored Correct. Recheck pointer interaction with a
  physical/pointer tool if available.
- **Range input tool artifact:** `fill_form` appended to existing numeric values
  in this custom editor field; Control+A followed by normal keyboard typing
  replaced values correctly and validation updated. Do not classify this as an
  application defect without a normal-input reproduction.

## Coverage summary and remaining gaps

Covered this round: synthetic registration and email change/resend; Classic quiz
create/edit/save and reload; all six question editors; local Pin media
upload/save; privacy setting; preview for Multiple Choice, Range, and Type
Answer; Type Answer alternate-response normalization; two-session Classic lobby,
answer flow, result refresh, host progression, all six question types reached,
completion, Results tabs; Results route refresh with valid refresh token;
cross-tab logout; live Pin submission; long-timer Puzzle keyboard reorder;
long-timer exact Range submission and off-step slider/number mismatch.

Not yet covered or incomplete:

- Repeat Results route refresh using naturally aged access/refresh tokens,
  inspect a Results-tab click during expiry, and compare a route that does not
  require user authentication. QA-014 is currently reproduced with a controlled
  expired access token and valid refresh.
- Exercise actual live Pin placement with a pointer, submit a correct/nearby
  coordinate, and compare host/player scoring; complete a full long-timer Puzzle
  reorder using pointer and keyboard.
- Full interaction/score verification for Range boundaries, margin thresholds,
  maximum/minimum values, and slider versus numeric input; live Type Answer
  punctuation/Unicode normalization and wrong-answer path.
- Host and player recovery after temporary connection interruption, host tab
  close/return, host leaving/kicking during active question, and multi-tab active
  game state synchronization.
- Zero-to-100 round-2 fractional/range boundary gameplay and result displays.
- Quiz media variants (ordinary question image/audio/video, cover image), upload
  cancellation/size/type failures, save conflicts, duplicate/delete/reorder
  persistence, and visibility/discovery integration.
- Synthetic account deletion, reset-token completion, and completing the email
  verification transition after email change. External email remains disabled;
  use an isolated local mail sink if one is available. Never enable external
  SMTP.
- Responsive/accessibility coverage across more viewport widths, keyboard
  navigation for complex dialogs/menus, and multi-tab credential change/refresh.
- Identify any remaining anonymous 401 with captured request URL/status and
  classify expected versus user-visible behavior.

## Guidance for the next session

1. Recheck the local development database target and keep the imported
   `klurigo_service` database strictly read-only. Never run e2e setup/teardown
   unless verified against the isolated `_test` database and Redis DB 1.
2. Reuse only the synthetic accounts/quizzes created for this round, or create
   fresh `.test` accounts. Do not record credentials, tokens, PINs, user IDs,
   game IDs, or upload paths.
3. Start with QA-014 follow-up: repeat Results tab access during expiry and
   contrast reload/direct navigation after a successful refresh. Then complete
   live Pin and long-timer Puzzle interactions before broadening to account
   email/deletion workflows.
4. Keep uncertain warnings/observations separate until there is a reproducible
   user-visible failure. Append new findings with the next unused identifier
   (QA-018 onward).
