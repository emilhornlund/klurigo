# Klurigo Exploratory QA

Living record of exploratory browser testing. This document is intended to let a
future QA session resume from the coverage and open questions below.

## Session 1 — 2026-10-17

### Environment and safety

- Tested only `http://localhost:3000` and its local backend at
  `http://localhost:8080`.
- Development configuration points MongoDB to `localhost:27017` database
  `klurigo_service` and Redis to `localhost:6379` database `0`; both local
  service ports were reachable. Backend readiness and frontend returned HTTP
  200 after starting the app with `yarn dev`.
- The repository's Docker CLI was unavailable, so Compose container identity
  could not be independently checked. No non-local URLs or external services
  were used during browser testing.
- The configured development database is treated as containing imported
  production data. No database inspection or mutation was performed; no account,
  quiz, game, or other persistent records were created or changed.
- Browser testing used an unauthenticated session. No real credentials were
  entered. Login/reset probes used the reserved synthetic address
  `qa.invalid@example.test` and a fabricated password.

### Coverage performed

| Area                | Workflow / variations                                                                                                                | Result                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home / navigation   | Loaded home; opened Login; direct-navigated to `/discover`; refreshed/navigated among unauthenticated routes                         | Home rendered; protected discovery redirected to home while unauthenticated.                                                                                                                                  |
| Game entry          | Empty form; invalid text including emoji and excess length; all-zero PIN; plausible six-digit PIN; submit unknown PIN                | Invalid characters were rejected/disabled; syntactically accepted unknown PIN displayed a recoverable “game code didn’t match” notification and returned to the empty form.                                   |
| Login               | Blank form; fabricated email/password; password failing the displayed composition rule; valid-shape fabricated credentials submitted | Submit disabled until fields pass client validation; invalid credentials displayed a generic failure notification without leaving the page.                                                                   |
| Password recovery   | Submitted the synthetic `.test` address                                                                                              | Returned to home and displayed a generic reset-link confirmation. No mailbox or external delivery was checked.                                                                                                |
| Registration        | Loaded form; inspected available controls; clicked nickname shuffle                                                                  | Form rendered; shuffle generated a nickname. The icon-only shuffle button has no accessible name (QA-001). Registration was not submitted.                                                                    |
| Responsive layout   | Inspected registration at 390×844 and home at a narrow mobile viewport; checked document width                                       | No horizontal document overflow observed. Registration controls and home join controls were visible.                                                                                                          |
| Browser diagnostics | Reviewed console and network activity during anonymous navigation                                                                    | No uncaught JavaScript exception observed. One HTTP 401 console resource error occurred in the anonymous session; endpoint and whether it is expected remain unverified. Requests observed were to localhost. |

## Session 2 — 2026-10-17 (authenticated access established)

### Environment and safe access

- Reconfirmed that the application and data services bind to localhost, with
  development MongoDB database `klurigo_service` and Redis database `0`. The app
  and backend readiness endpoints returned HTTP 200.
- Started the development app with `EMAIL_ENABLED=false` because the backend's
  mail transport defaults to an external SMTP host. This kept account creation
  and later email-related actions from sending external mail.
- Avoided E2E setup/teardown because it resets shared test databases. Created
  two dedicated synthetic local accounts through the registration UI; their
  credentials and identifying details are intentionally omitted here. No
  imported records were modified.

### Cycle 1 — account creation and discovery

| Area                                    | Workflow / variations                                                                                                                                            | Result                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration / authentication           | Submitted a new synthetic account using the registration UI; allowed registration to chain into login; inspected authenticated navigation menu                   | Account creation and login succeeded, landing on the authenticated home page with the user menu. Email sending was disabled in this local process.                                                                                                                                      |
| Discovery                               | Opened `/discover` from the authenticated menu; inspected all visible discovery rails and quiz cards at 390×844                                                  | Featured, Trending, Top Rated, Most Played, New & Noteworthy, and Category Spotlight rails rendered with cards and “See all” links. No crash or horizontal layout overflow observed.                                                                                                    |
| Discovery search/filter                 | Searched for a synthetic nonmatching query; cleared search; applied category/language/mode/sort criteria that returned no matches; cleared filter                | Search and empty-state recovery worked. Filter dialog exposed expected selectors, Apply closed it, and Clear filter restored discovery rails.                                                                                                                                           |
| Discovery section/detail                | Opened Featured “See all”; loaded more cards; opened a public card's details page and used browser Back                                                          | Section list appended further cards; detail route rendered metadata and returned to discovery. Did not start a game or mutate imported content.                                                                                                                                         |
| Accessibility spot check                | Inspected search/filter icon buttons in the discovery form using the accessibility snapshot and DOM                                                              | Both functional icon buttons have no accessible name (QA-002).                                                                                                                                                                                                                          |
| Quiz editor accessibility / recovery    | Inspected mobile toolbar names; invoked Exit with unsaved edits and chose Stay                                                                                   | Settings, code/visual toggle, Save, Preview, and Exit are unnamed on mobile (QA-004). Exit correctly warns about unsaved changes; Stay keeps the editor and edits open.                                                                                                                 |
| Quiz creator — questions/media          | Created a private synthetic quiz; exercised Multiple Choice, Range, True/False, Type Answer, Puzzle, and Pin editors; uploaded a local test image                | Initial valid quiz save succeeded and survived reload. Local image upload returned HTTP 201 and was served locally with HTTP 200, but saving the quiz with the uploaded Pin image failed with HTTP 400 (QA-003).                                                                        |
| Standard question media                 | Added a local uploaded image to a synthetic Range question and attempted to save                                                                                 | Upload succeeded locally, but quiz update also returned HTTP 400 (same local media URL validation issue as QA-003). Unsaved edit was discarded afterward.                                                                                                                               |
| Quiz preview                            | Previewed Range, True/False, Type Answer, and Puzzle; submitted values and exited after the final question                                                       | Preview accepted an alternate configured Type Answer response and returned to the editor after the final item; no quiz data was changed by preview.                                                                                                                                     |
| Multiplayer gameplay                    | Hosted a private synthetic quiz in one session; joined from an isolated browser context as an anonymous synthetic player; started and advanced the game          | Lobby join and host progression worked. The game recorded timeout/wrong-answer outcomes, an alternate Type Answer answer scored correct, and the results/podium were reached.                                                                                                           |
| Results / rating                        | Viewed host results Summary, Players, Questions; submitted a player rating; inspected own-quiz rating restriction                                                | Tabs showed the single player and per-question outcomes. Player rating returned HTTP 200; host cannot rate their own quiz.                                                                                                                                                              |
| Profile / settings / history            | Opened synthetic profile, quiz shelf, game history, and settings; tried mismatched confirmation/wrong password; saved a valid nickname and password change       | Synthetic records appeared in the relevant pages. Password mismatch and wrong current password were rejected; a correct password change succeeded and the new password worked in another session. Nickname update persisted after reload.                                               |
| Quiz visibility / discovery integration | Temporarily changed the synthetic Zero-to-100 quiz from Private to Public, searched its title in Discover, opened its card, restored Private, and searched again | Public quiz was returned and its details opened; after restoring Private, the same query showed no quizzes. No imported quiz was modified.                                                                                                                                              |
| Game recovery / moderation              | Refreshed host lobby, active question, and player waiting room; resumed a completed game; left/rejoined and removed synthetic players; quit an active game       | Host and player states survived refresh. Resume restored the completed game. Leave/rejoin and removal worked; confirmed Quit ended the game and returned its player to home.                                                                                                            |
| Late join                               | Host started a two-question Zero-to-100 game with one player; a second synthetic account joined during the active second question and answered exactly           | Late joiner received the current question, their exact answer scored the intended bonus, and the final leaderboard included both players.                                                                                                                                               |
| Duplicate nickname join                 | Two synthetic browser sessions attempted to join the same active game with the same nickname; second player retried with a unique nickname                       | Duplicate attempt returned HTTP 409 but the UI incorrectly said the game code was wrong; retry with a unique nickname joined successfully (QA-013).                                                                                                                                     |
| Accessibility — player management       | Hovered the player chip in the host Players dialog and inspected its revealed remove action                                                                      | Remove-player icon is unnamed in the accessibility tree (QA-005); it appears on hover and opens a confirmation dialog when activated.                                                                                                                                                   |
| Zero-to-100 mode                        | Created a private synthetic quiz; duplicated/reordered questions; played exact and near-miss answers; tested fractional target entry                             | Question duplication/reordering persisted after save and reload. Exact answer scored `-10` (intentional bonus); a 5-point miss scored `5`. Fractional entry was silently truncated to an integer (QA-006).                                                                              |
| Session refresh                         | Forced the synthetic user's access token expiration in local browser storage while keeping its refresh token valid, then reloaded                                | App called local `/api/auth/refresh` and returned HTTP 200; authenticated profile lookup returned HTTP 200 and the session remained signed in.                                                                                                                                          |
| Refresh failure                         | In the isolated synthetic account context, expired the access token and replaced its refresh token with an invalid synthetic JWT, then opened Profile Settings   | Local refresh returned HTTP 400; the app returned to public home and cleared the authenticated UI without displaying the refresh error notification (QA-009).                                                                                                                           |
| Google OAuth error recovery             | Direct-navigated the isolated guest context to the local callback route with a synthetic access-denied error                                                     | Callback redirected to Login but no error notification appeared despite callback code calling `notifyError` (QA-007). No Google or other external service was contacted.                                                                                                                |
| Responsive quiz editor                  | Inspected editor at 390×844, 768×1024, 769×1024, and 1440×900                                                                                                    | Mobile and desktop rendered without document-wide overflow. At tablet widths, the Exit toolbar button extended beyond the viewport edge (QA-008).                                                                                                                                       |
| Question management                     | Duplicated a Zero-to-100 question, changed its text/answer, reordered with keyboard drag controls, saved, and reloaded                                           | The two questions remained in the new order with updated values after reload. The picker arranged cards horizontally at the tablet viewport; `Space` then `ArrowLeft` moved the second question ahead of the first.                                                                     |
| Live Puzzle sorting                     | Used Space and ArrowUp to reorder a randomized synthetic Puzzle answer                                                                                           | Correct sequence submitted successfully in a 90-second live game; pointer-helper attempt remains inconclusive.                                                                                                                                                                          |
| Interrupted quiz editing                | Changed a synthetic quiz question without saving, then reloaded the editor                                                                                       | Reload proceeded without a before-unload prompt and the saved question returned; the unsaved synthetic edit was lost (QA-012). The in-app Exit warning had worked in earlier testing.                                                                                                   |
| Accessibility audit                     | Ran Lighthouse snapshot audit on synthetic Profile Games page at 769×1024                                                                                        | Accessibility 91/100. Audit found no `<main>` landmark and a viewport meta tag that disables mobile zoom (QA-010, QA-011).                                                                                                                                                              |
| Quiz deletion / history                 | Canceled then confirmed deletion of the private synthetic Classic quiz; revisited the quiz shelf and Profile Games                                               | Cancel preserved the quiz; confirmation removed it. Its associated synthetic hosted game disappeared from history, while the separate Zero-to-100 quiz and its game history remained. Repository `GameListener` confirms game cleanup on `quiz.deleted`; no imported data was involved. |

### Unconfirmed observations (updated)

- Some discovery cards expose an unusual token-like creator label in place of a
  familiar display name. This was seen in imported read-only discovery data; it
  may reflect stored display data rather than an application defect. Avoid
  recording card titles or creator information; investigate with synthetic
  records and rendering code before classifying it.

### Cycle 2 — discovery search, filters, and section navigation

Confirmed discovery search returns a clear empty-results state for a no-match
query and recovers through “clear the filter”. Applied multiple filters and
sorting options; no matching quizzes were returned, and clearing restored the
rails. Featured section pagination appended another set of cards. A card's
details page opened successfully; gameplay was deliberately not launched from
an imported quiz. The discovery filter dialog worked with pointer input.

This cycle also confirmed **QA-002**, below: the search and filter icon buttons
are exposed without names in the accessibility tree. DOM inspection shows
icon-only `Button` instances without text or accessible-label attributes.

#### QA-002 — Discovery search and filter icon buttons are unnamed

- **Severity:** P2 (accessibility; screen-reader users cannot identify the
  search-submit and open-filter actions)
- **Affected UI:** Discovery search form and any other pages reusing
  `QuizTableFilter`.
- **Reproduction:**
  1. Sign in and open `/discover`.
  2. Inspect the magnifying-glass and filter icon controls in the accessibility
     tree.
- **Expected:** Each icon button has an accessible name describing its action,
  such as “Search quizzes” and “Open filters”.
- **Actual:** Both appear as unnamed buttons. Their actions work when clicked:
  the search button shows the no-results state for an unmatched query, and the
  filter button opens the “Refine Your Quiz Search” dialog.
- **Sanitized evidence:** Discovery snapshot showed `textbox "Search"` followed
  by two bare `button` nodes. DOM inspection found `search-button` with a
  magnifying-glass icon and `filter-button` with a filter icon, neither with
  text, `aria-label`, or title. No quiz titles, account identifiers, or creator
  details are needed to reproduce.
- **Likely cause / code:**
  `packages/klurigo-web/src/components/QuizTableFilter/QuizTableFilter.tsx:82-99`
  renders both icon-only buttons without accessible labels.

### Cycle 3 — quiz editor, all classic question types, and local media

Created a private synthetic quiz with a valid multiple-choice question, saved
it, and reloaded the edit route; its title, question, options, and correct
answer persisted. Converted/added Range, True/False, Type Answer, Puzzle, and
Pin questions and entered synthetic content for each. Range bounds were
adjusted and the correct answer was returned inside the accepted interval.
Uploaded a repository test image using the editor's local Upload tab; the upload
completed and its local URL loaded. Saving the edited quiz then failed with a
server validation response (QA-003). No imported records were targeted.

#### QA-003 — Local uploaded quiz media prevents quiz save

- **Severity:** P2 (quiz authors cannot save Pin images or ordinary question
  media uploaded through the local development workflow)
- **Affected UI:** Quiz creator, Pin question type, and question media uploads.
- **Reproduction:**
  1. Sign in with a synthetic local account and create a private quiz.
  2. Add a Pin question and upload its image, or attach a local image to a
     standard question using **Add image** → **Upload**.
  3. Save the quiz.
- **Expected:** The successfully uploaded local image is accepted as a valid
  media URL and the quiz saves for either field.
- **Actual:** Upload completed with HTTP 201 and the returned local image URL
  loaded with HTTP 200. Saving with a Pin image failed with HTTP 400 and a
  sanitized validation error for `questions[].imageURL` (“The image URL must be a
  valid URL.”). A second reproduction with ordinary question media also failed
  to save with HTTP 400. Both showed “Saving your quiz failed. Please try again.”
  The client did not prevent save or surface the field-level cause.
- **Sanitized evidence:** `POST /api/media/uploads/photos` returned 201. The
  local image `GET /uploads/images/{synthetic-upload-path}` returned 200.
  `PUT /api/quizzes/{synthetic-quiz-id}` returned 400 for Pin `imageURL`; a
  separate standard-media update also returned HTTP 400. No token, quiz ID,
  account identifier, or image path is included here.
- **Likely cause / code:**
  `packages/klurigo-service/src/modules/quiz-api/controllers/decorators/api/api-question-pin-image-url-property.decorator.ts:12-22`
  and `packages/klurigo-service/src/modules/quiz-api/controllers/decorators/api/api-question-media-url-property.decorator.ts:12-22`
  use `IsUrl` with default options, while development uploaded image URLs use
  the `localhost` origin configured by `KLURIGO_URL` in
  `packages/klurigo-service/.env.development`. The normal local URL is rejected
  by both server validators after the upload flow accepted it.

#### QA-004 — Quiz editor mobile toolbar actions are unnamed

- **Severity:** P2 (accessibility; screen-reader users cannot identify essential
  quiz settings, editing, save, preview, and exit controls on mobile)
- **Affected UI:** Quiz editor at mobile viewport widths.
- **Reproduction:**
  1. Open a quiz in the editor at a mobile viewport such as 390×844.
  2. Inspect the five icon-only toolbar controls in the accessibility tree.
- **Expected:** Each icon-only control exposes its action as an accessible name.
- **Actual:** The accessibility snapshot exposes unnamed buttons for Settings,
  Visual/Code, Save, Preview, and Exit. DOM inspection shows all five retain
  empty `aria-label` and `title` attributes; their text values are hidden at the
  mobile breakpoint.
- **Sanitized evidence:** At 390×844, toolbar DOM IDs were
  `settings-button`, `toggle-editor-button`, `save-button`, `preview-button`,
  and `exit-button`; each had an icon and no accessible name. The controls remain
  operable by pointer. Exit opened an unsaved-changes dialog; Stay returned to
  the editor with the unsaved edits retained.
- **Likely cause / code:**
  `packages/klurigo-web/src/pages/QuizCreatorPage/components/QuizCreatorPageUI/components/QuizEditorHeader/QuizEditorHeader.tsx:73-130`
  provides visible `value` text but sets `hideValue="mobile"` on all toolbar
  buttons without adding an accessible label.

### Runtime observations

- The quiz creator emitted React errors during normal edits to True/False,
  Type Answer, and Puzzle answers: “Cannot update a component while rendering a
  different component.” The warning stack pointed to the editor's parent
  question-state setter. The answer editors call the parent `onChange` from
  inside a local state updater (`TrueFalseAnswerEditor.tsx:55-66` and
  `shared/useAnswerValues.ts:25-33`). Question values appeared in editor state,
  but the effect on production builds and persistence remains unverified; keep
  this as an investigation item until data loss or another user-visible failure
  is reproduced.

### Cycle 4 — preview, multiplayer game, results, and account pages

Used the saved private synthetic quiz for a two-session game: the authenticated
host ran in one browser context and a synthetic anonymous player joined from an
isolated context. The first question timed out while exploring the flow; later
questions covered a wrong True/False response, an alternate accepted Type
Answer response that scored correct, and a Puzzle response. Host progression,
player feedback, leaderboard, podium, game-over, and game-history results were
reached. The player submitted a rating (local `PUT /api/games/{synthetic-game-id}/ratings`
returned HTTP 200); the quiz owner was correctly prevented from rating their
own quiz. Results Summary, Players, and Questions views showed the expected
single-player and per-question summaries.

Also inspected the synthetic user's profile, quiz shelf, game history, and
settings. Password confirmation mismatch disabled submission; a compliant new
password with an incorrect current password returned a generic error without
changing credentials. Invalid short nickname input showed client validation.
The Pin question was deleted from the synthetic quiz before saving its other
four valid question types; no imported data was edited.

### Cycle 5 — refresh/rejoin recovery and host player moderation

Started a second game from the synthetic quiz. Reloading the host lobby retained
the same game and lobby PIN; reloading the player's waiting room retained the
player identity and waiting-room state. Returning to the public home page showed
“Resume game” for the completed prior game; selecting it restored the completed
player results. On the second game, the player left via the confirmation dialog,
rejoined using the same nickname, then was removed by the host using the Players
dialog and its confirmation. The player returned to home and the host roster
updated to empty. These actions only affected synthetic game records.

The remove-player control is a hover-revealed icon button with no accessible
name, confirming **QA-005**.

#### QA-005 — Host remove-player action is unnamed

- **Severity:** P2 (accessibility; screen-reader users cannot identify the
  destructive remove-player action)
- **Affected UI:** Host game Players dialog.
- **Reproduction:**
  1. Host a game with a synthetic player and open **Settings → Players**.
  2. Hover the player's nickname chip to reveal the remove control; inspect the
     accessibility tree.
- **Expected:** The remove button has a clear accessible name such as “Remove
  player”.
- **Actual:** After hover reveals it, Chrome DevTools exposes a bare unnamed
  button. The button opens the expected “Kick from the Game?” confirmation; on
  confirmation, the synthetic player is removed and returned to home.
- **Sanitized evidence:** Before hover the control is `display:none`; after hover
  the snapshot shows a second unnamed `button` under the “Who’s Playing?” dialog.
  DOM inspection found an X icon and no `aria-label` or title. No game PIN or
  persistent imported data is required for reproduction.
- **Likely cause / code:**
  `packages/klurigo-web/src/components/NicknameChip/NicknameChip.tsx:113-118`
  renders the delete affordance as an icon-only button without an accessible
  name. The host roster uses it from
  `packages/klurigo-web/src/states/common/HostGameFooter/components/PlayerManagementModal/PlayerManagementModal.tsx:219-228`.

### Cycle 6 — Zero-to-100 creation and live scoring

Created and saved a private Zero-to-100 quiz, then played it with a synthetic
anonymous participant. The player slider accepted the exact target value and
returned `-10`. Investigated
`packages/klurigo-service/src/modules/game-task/utils/scoring/zero-to-one-hundred/zero-to-one-hundred-range-strategy.ts`:
its comments and implementation explicitly define `-10` as the exact-match
bonus, so this is expected, not a defect. The game finished normally.

While editing the synthetic 0–100 question, entered `25.5` in the correct-answer
number field. On blur the displayed value became `25` and the quiz remained
unchanged, even though the service DTO accepts general numbers between 0 and 100. This reproduced **QA-006**.

#### QA-006 — Numeric quiz inputs silently truncate fractional values

- **Severity:** P2 (quiz authors cannot enter fractional numeric values, and
  submitted values can silently differ from what they typed)
- **Affected UI:** Shared numeric `TextField` used by range-based question
  values, including the Zero-to-100 correct answer.
- **Reproduction:**
  1. Open a Zero-to-100 quiz in the editor.
  2. Focus **Correct answer (0–100)**, select its existing value, and type
     `25.5`.
  3. Blur the field.
- **Expected:** Preserve `25.5` if fractional numeric answers are accepted by the
  service, or clearly reject fractional input without changing it silently.
- **Actual:** The field changes to `25` after blur; the editor treats it as
  unchanged, so Save remains disabled. The backend question DTO uses `IsNumber`
  with only `Min(0)` and `Max(100)`, which accepts fractional values.
- **Sanitized evidence:** At the browser UI, typed `25.5`; after tabbing away,
  the accessibility snapshot showed spinbutton `value="25"` and no validation
  message. Editing source confirms this is not a database mutation or a browser
  display-only issue.
- **Likely cause / code:**
  `packages/klurigo-web/src/components/TextField/TextField.tsx:157-164` uses
  `parseInt(newValue, 10)` for every `type="number"` input, dropping the decimal
  portion. The Zero-to-100 backend DTO accepts numbers in its range at
  `packages/klurigo-service/src/modules/quiz-api/controllers/models/question-zero-to-one-hundred-range.ts:61-64`.

### Cycle 7 — access-token expiration and automatic refresh

Using only the synthetic account's browser session, expired the local access
token while preserving its valid refresh token, then reloaded the profile page.
The app issued `POST /api/auth/refresh` → 200, refreshed authenticated profile
data with HTTP 200, and remained signed in. This controlled expiry case passed;
the earlier Results-tab redirect after the long game remains unconfirmed and
may have been transient navigation state rather than a general refresh failure.

### Cycle 8 — OAuth callback denial recovery

In the isolated guest browser context, navigated directly to the local Google
callback route with a synthetic `access_denied` query. The application returned
to Login without making any request to Google or another external service.
Chrome's accessibility snapshot showed the Login page and an empty notification
region on two repetitions, although the callback component invokes
`notifyError('Google OAuth error. Please try again.')` before navigating. This
reproduced **QA-007**.

#### QA-007 — Google OAuth callback denial gives no visible error feedback

- **Severity:** P2 (authentication recovery; the user is returned to Login with
  no explanation that OAuth was denied or could not complete)
- **Affected UI:** Google OAuth callback error path.
- **Reproduction:**
  1. In a clean or logged-out local browser session, open
     `http://localhost:3000/auth/google/callback?error=access_denied&state=qa-synthetic`.
  2. Observe the page after it redirects to Login.
- **Expected:** Login is shown with the callback's generic Google OAuth error
  notification visible.
- **Actual:** The browser redirects to `/auth/login`; no notification or error
  text is present, despite the callback handler calling `notifyError`.
- **Sanitized evidence:** Reproduced twice in the isolated guest context. The
  final accessibility snapshot contained the Login form and an empty
  `Notifications` region. Only local routes loaded; no authorization code,
  credentials, or external requests were used.
- **Likely cause / code:**
  `packages/klurigo-web/src/pages/AuthGoogleCallbackPage/AuthGoogleCallbackPage.tsx:41-44`
  calls `notifyError` immediately before navigating to Login. The notification
  is not visible after the route transition; inspect toast mounting/route timing.

### Cycle 9 — ordinary question image upload

To distinguish a Pin-specific defect from a shared media problem, attached a
local test image to a standard Range question on the private synthetic quiz.
The media dialog uploaded and served the image locally, but saving the quiz
again returned HTTP 400. The unsaved media edit was discarded through the
editor's leave confirmation; the previously saved quiz remained intact. This
extends QA-003 to ordinary question media in addition to Pin images.

### Cycle 10 — tablet editor layout

Inspected the Zero-to-100 editor at desktop 1440×900, tablet 768×1024 and
769×1024, and mobile 390×844. The 1440 and 390 layouts fit the viewport. At
769px, the quiz editor's Exit button bounding box extended to x≈807; only about
12px of its 50px width remained within the viewport, while document width stayed
769px and provided no horizontal scrolling. This confirmed **QA-008**.

#### QA-008 — Quiz editor toolbar clips past tablet viewport edge

- **Severity:** P2 (responsive layout; the rightmost Exit control is mostly
  clipped at tablet widths)
- **Affected UI:** Quiz creator/editor header around 768–800 CSS pixels.
- **Reproduction:**
  1. Open a quiz in the editor.
  2. Set the browser viewport to 769×1024.
  3. Inspect the top toolbar's Exit button and page width.
- **Expected:** All toolbar actions remain fully visible and reachable without
  horizontal scrolling at the tablet breakpoint.
- **Actual:** The Exit button extends from x≈756.5 to x≈806.8, leaving only
  ≈12.5px visible inside the 769px viewport. `documentElement.scrollWidth` is
  still 769, so the clipped portion cannot be reached by horizontal scrolling.
- **Sanitized evidence:** At 768×1024 the screenshot visibly clipped the right
  edge of the header. At 769×1024 DOM geometry showed the Exit button's right
  bound past the viewport and no document-level horizontal overflow. At 1440×900
  the toolbar fit normally.
- **Likely cause / code:**
  `packages/klurigo-web/src/pages/QuizCreatorPage/components/QuizCreatorPageUI/components/QuizEditorHeader/QuizEditorHeader.tsx:53-130`
  keeps the title input and every labeled toolbar action in one row, while
  `packages/klurigo-web/src/components/Page/Page.module.scss:52-71` lays the
  header out as a non-wrapping flex row. The tablet header lacks space for the
  full combined control width.

### Cycle 11 — question duplication and keyboard reorder

Duplicated a valid Zero-to-100 question, changed the clone's prompt and target,
then reordered the questions in the horizontally arranged tablet picker using
the accessible drag handle: Space to pick up, ArrowLeft to move over question 1,
Space to drop. Save returned success; reload preserved order and content. An
initial attempt with ArrowUp did not change the order because the cards were
side-by-side, not vertically stacked. A later two-question live game used a
5-point near miss (score penalty `5`) and an exact answer (bonus `-10`), producing
a cumulative score of `-5`. Host and player results agreed; no unexpected
scoring issue was found in these cases.

### Cycle 12 — profile details persistence

Changed the synthetic account's default nickname to another synthetic value
through Profile Settings, saved, and reloaded the settings route. The new value
persisted and the UI showed its success notification. Prior invalid-short-name
and password-confirmation checks blocked client-side; a wrong current password
was rejected without changing the credential. A later correct current password
and matching new-password confirmation succeeded, and a second session signed
in with the new password.

### Cycle 13 — quiz visibility and discovery integration

Temporarily changed the synthetic Zero-to-100 quiz visibility from Private to
Public, searched for its synthetic title in Discover, and opened the result
card. The details showed Public visibility. Returned to the editor, changed it
back to Private, saved, and repeated the search; the result state showed no
quizzes. The synthetic quiz is private again.

### Cycle 14 — automatic refresh failure recovery

In the isolated synthetic account context, forced the access token to expire and
replaced the refresh token with a deliberately invalid synthetic value, then
navigated to Profile Settings. Local `POST /api/auth/refresh` returned HTTP 400
(`refreshToken must be a jwt string`). The app returned to public home with no
visible notification. This reproduced **QA-009**; the synthetic user record was
not changed.

#### QA-009 — Automatic session refresh failure feedback is delayed

- **Severity:** P2 (users are returned to public mode without timely recovery
  guidance; a stale refresh error can appear after a later successful login)
- **Affected UI:** Authenticated route/API requests after an expired access token
  and invalid/expired refresh token.
- **Reproduction:**
  1. Sign in with a synthetic account in a local browser session.
  2. In that browser's local storage only, expire the access-token metadata and
     replace the refresh-token value with an invalid synthetic JWT.
  3. Open `/profile/settings`.
- **Expected:** The refresh failure is surfaced with the generic session-refresh
  notification and a clear route to sign in again.
- **Actual:** `POST /api/auth/refresh` returns HTTP 400; the browser ends on the
  public home page with no notification in the live region. The authenticated
  menu/profile controls disappear. A later valid sign-in succeeded, but a
  session-refresh error toast appeared only after that successful navigation.
- **Sanitized evidence:** The failing request was local
  `POST /api/auth/refresh` → 400 with validation error on `refreshToken`; a
  subsequent synthetic login and profile lookup returned HTTP 200. No token
  value or account identifier is recorded. The initial page snapshot showed
  public home and an empty notification region; the refresh error appeared after
  the successful login.
- **Likely cause / code:**
  `packages/klurigo-web/src/api/api-client-core.ts:128-153` performs the automatic
  refresh directly and throws parsed HTTP errors without notifying. The
  separate `AuthResource.refresh` helper calls `notifyError` in
  `packages/klurigo-web/src/api/resources/auth.resource.ts:174-192`, but this
  automatic refresh path bypasses that helper.

### Cycle 15 — quiz deletion and history cleanup

On the synthetic quiz details page, opened Delete Quiz, canceled, and confirmed
the same dialog on a second attempt. Cancel preserved the quiz. Confirm deleted
the private synthetic Classic quiz, returned to the quiz shelf with a success
message, and removed its associated hosted-game entry from the synthetic user's
Profile Games list. The separately created Zero-to-100 quiz and its game history
remained. Repository inspection of `packages/klurigo-service/src/modules/game-api/handlers/game.listener.ts`
confirmed that `quiz.deleted` intentionally deletes associated games; no
imported records were involved.

### Cycle 16 — cross-page accessibility audit

Ran Chrome Lighthouse snapshot mode on the authenticated Profile Games page at
769×1024. It scored Accessibility 91/100 and reported two reproducible
semantics/zoom failures: no main landmark and `user-scalable=no` in the viewport
meta tag. Inspected the actual `Page` markup and the checked-in web `index.html`
to trace both findings; recorded them as QA-010 and QA-011.

### Cycle 17 — interrupted editor reload

Changed a question in the saved synthetic Zero-to-100 quiz without saving, then
reloaded the browser page while dismissing any possible before-unload dialog. No
dialog appeared; the editor reloaded from the persisted quiz and the unsaved
question text was gone. This reproduced **QA-012**. The editor's in-app Exit
button had separately shown an unsaved-changes warning, so this is specifically
the browser reload/unload path.

### Cycle 18 — late join during live gameplay

Started a two-question Zero-to-100 game with one synthetic player, then joined
from a second synthetic account after the first question had advanced. The late
joiner received the active question, answered the exact target, and appeared in
the final leaderboard alongside the first player. The first player's earlier
timeout and the late joiner's initial score placement were reflected in the
results. No unexpected late-join defect was observed.

### Cycle 19 — duplicate nickname recovery

Started another private synthetic Zero-to-100 game and joined the lobby from a
separate synthetic account using a nickname already held by the first player.
The backend rejected the duplicate with HTTP 409. The join page stayed open, but
the notification said “Couldn’t join the game. Check the code and try again.”
Changing only the nickname to a unique synthetic value allowed the same session
to join the same game immediately. This reproduced **QA-013**.

#### QA-013 — Duplicate nickname conflict is reported as an invalid game code

- **Severity:** P2 (join failure is recoverable, but the actionable cause is
  hidden behind a misleading game-code error)
- **Affected UI:** Player join flow when a nickname is already in the active
  game's roster.
- **Reproduction:**
  1. Create a local synthetic game and join it from one player session with a
     synthetic nickname.
  2. From a second session, enter the same game PIN and duplicate nickname.
  3. Observe the failure, then retry with a unique nickname.
- **Expected:** The duplicate attempt explains that the nickname is already in
  use and allows the player to choose another.
- **Actual:** Join returns HTTP 409 and the page displays “Couldn’t join the
  game. Check the code and try again.” A unique-nickname retry successfully
  joins the same game, confirming the PIN was valid.
- **Sanitized evidence:** Local `POST /api/games/{synthetic-game-id}/players`
  returned HTTP 409 for the duplicate; the next request with a unique synthetic
  nickname returned HTTP 204. Nicknames and game IDs are omitted.
- **Likely cause / code:**
  `packages/klurigo-web/src/api/resources/game.resource.ts:76-88` maps every
  `joinGame` rejection to the same invalid-code notification. The service
  distinguishes this case with `NicknameNotUniqueException` in
  `packages/klurigo-service/src/modules/game-api/exceptions/nickname-not-unique.exception.ts:11-14`.

### Cycle 20 — active-game refresh and host quit

During another synthetic live game, reloaded the host while a question was
active; the same question, PIN, timer state, and player session resumed. The
player submitted an answer. The host then used Settings → Quit and confirmed;
the game ended and the player returned to home. No imported game or account was
involved.

### Cycle 21 — live Puzzle keyboard sorting

Created a private synthetic Classic quiz with one Puzzle question and a 90-second
timer. In a two-session live game, the player used the sortable controls' keyboard
instructions (Space, ArrowUp twice, Space) to reorder a randomized list into the
configured sequence. Submission returned Correct and the host saw the matching
sequence. This verified keyboard sorting when tool latency did not consume the
short timer.

### Unconfirmed observations (session 2 follow-up)

- After the first Results page visit, clicking the Players tab timed out and the
  host browser returned to the public home page. The synthetic account could
  sign in again, and the history Results page plus its tabs worked on a later
  visit. This may have coincided with access-token expiry or transient route
  state. Reproduce while observing refresh behavior and local API statuses before
  classifying.
- Pointer-based Puzzle sorting is still unverified: the Chrome drag helper
  reported a drop over the source item. A separate keyboard attempt in a lengthy
  session ended Incorrect; a controlled keyboard sort in another session
  succeeded. Repeat with a pointer-driven reorder and a timer that removes tool
  latency from the result.
- When testing profile-result navigation after a lengthy game session, one
  Results-tab interaction returned the host browser to public home; a later
  sign-in restored the history page and all three tabs worked. Continue the
  access-token refresh investigation as recorded above. A separately forced
  expired access token with a valid refresh token refreshed successfully, so
  that controlled path is not itself a defect.

### Confirmed bugs

- **QA-001:** Registration nickname shuffle control is unnamed.
- **QA-002:** Discovery search and filter icon buttons are unnamed.
- **QA-003:** Local uploaded Pin and standard question media fail quiz-save URL validation.
- **QA-004:** Quiz editor toolbar actions are unnamed on mobile.
- **QA-005:** Host remove-player control is unnamed.
- **QA-006:** Numeric quiz inputs silently truncate fractional values.
- **QA-007:** Google OAuth callback denial returns to Login without visible error feedback.
- **QA-008:** Quiz editor Exit toolbar control clips at tablet widths.
- **QA-009:** Automatic refresh failure feedback is delayed until after a later successful login.
- **QA-010:** Application pages lack a main landmark.
- **QA-011:** The viewport meta tag disables mobile zoom.
- **QA-012:** Quiz editor reload silently discards unsaved changes.
- **QA-013:** Duplicate player nickname conflicts are reported as invalid game codes.

#### QA-001 — Nickname shuffle control is unnamed to assistive technology

- **Severity:** P2 (accessibility; the optional nickname-generation action is
  not identifiable to screen-reader users)
- **Affected UI:** Registration nickname field; shared `NicknameTextField`
  instances may expose the same control elsewhere.
- **Reproduction:**
  1. Open `http://localhost:3000/auth/register` while logged out.
  2. Inspect the nickname field's refresh/shuffle icon with the accessibility
     tree or screen reader.
- **Expected:** The icon-only button exposes a descriptive accessible name such
  as “Generate nickname”.
- **Actual:** Chrome DevTools accessibility snapshot exposes an unnamed button
  adjacent to “Default Nickname”. DOM inspection found no text, `aria-label`, or
  title. The button's icon is marked `aria-hidden="true"`.
- **Sanitized evidence:** Snapshot had `textbox "Default Nickname"` followed by
  `button` with no accessible name. At 390×844, the refresh icon is visible and
  clickable; clicking generated a nickname, so the issue is its discoverability
  to assistive technology rather than failure of the action itself.
- **Likely cause / code:** `packages/klurigo-web/src/components/NicknameTextField/NicknameTextField.tsx:49-57`
  renders the icon-only `Button` with `faRefresh` and no accessible label.
  Since this is a shared component, check all of its usages when addressing the
  issue.

#### QA-010 — Application pages lack a main landmark

- **Severity:** P2 (accessibility; screen-reader users cannot jump directly to
  the primary page content by landmark)
- **Affected UI:** Authenticated Profile Games page and pages rendered through
  the shared `Page` component.
- **Reproduction:**
  1. Sign in and open `/profile/games`.
  2. Inspect the accessibility landmarks or run Lighthouse Accessibility on the
     rendered page.
- **Expected:** The primary page content is contained in one `<main>` landmark.
- **Actual:** The page has no main landmark. Lighthouse reports
  `landmark-one-main` as a failure; the accessibility tree exposes page content
  without a main region.
- **Sanitized evidence:** Lighthouse snapshot on local Profile Games at
  769×1024 returned Accessibility 91/100; audit `landmark-one-main` failed on
  the root HTML element. No user or quiz data is required to reproduce.
- **Likely cause / code:**
  `packages/klurigo-web/src/components/Page/Page.tsx:188-269` wraps header and
  page content in `div` elements; the shared page content wrapper is not
  represented as a `<main>` element or `role="main"`.

#### QA-011 — Mobile viewport disables user zoom

- **Severity:** P2 (accessibility; low-vision users cannot magnify page content
  using browser pinch zoom)
- **Affected UI:** All web application routes on mobile devices.
- **Reproduction:**
  1. Open any Klurigo route at a mobile viewport.
  2. Inspect the viewport meta tag or use the browser's pinch-zoom gesture.
- **Expected:** Mobile browser zoom remains available up to a practical maximum
  scale.
- **Actual:** The checked-in viewport meta tag sets `maximum-scale=1.0` and
  `user-scalable=no`, disabling user zoom. Lighthouse `meta-viewport` audit
  fails.
- **Sanitized evidence:** Lighthouse snapshot reported the `meta-viewport`
  failure and identified the document's viewport element. The restriction is
  global and does not depend on account state.
- **Likely cause / code:** `packages/klurigo-web/index.html:12` explicitly sets
  the no-zoom viewport parameters.

#### QA-012 — Quiz editor reload silently discards unsaved changes

- **Severity:** P2 (a browser refresh can silently lose an author's unsaved quiz
  edits)
- **Affected UI:** Quiz creator/edit routes when quiz settings or questions have
  unsaved changes.
- **Reproduction:**
  1. Open a saved synthetic quiz in the editor.
  2. Change a question field and do not save.
  3. Reload the browser tab.
- **Expected:** Warn before leaving or otherwise preserve/recover the unsaved
  changes.
- **Actual:** Reload proceeds without a before-unload prompt; the editor reloads
  the saved quiz and the unsaved question text is lost. The in-app Exit action
  does show a “You have unsaved changes” confirmation.
- **Sanitized evidence:** Accessibility snapshot before reload showed the
  unsaved synthetic prompt and enabled Save button. After reload the saved prompt
  returned and Save was disabled. `reload` with before-unload dismissal still
  completed, confirming no dialog was raised.
- **Likely cause / code:**
  `packages/klurigo-web/src/pages/QuizCreatorPage/QuizCreatorPage.tsx:299-303`
  registers React Router `useBlocker` for in-app navigation. No `beforeunload`
  handler was found for browser reload/close.

### Unconfirmed observations

- An HTTP 401 appeared as a browser console resource error during unauthenticated
  navigation. The request URL was not established from the available console
  entry; it may be the expected unauthenticated user/session lookup. Revisit
  while recording network requests with URL/status before classifying it.
- Password recovery showed a success-style message for the reserved synthetic
  email. This may intentionally avoid account enumeration; actual delivery and
  reset-token handling were not tested.
- Quiz editor React warnings during answer changes remain an investigation item;
  see [Runtime observations](#runtime-observations).

### Remaining areas to explore

- More quiz edit/delete interactions: update visibility, duplicate/reorder
  questions, modify quiz details, and verify deletion/history behavior. One
  synthetic quiz was deleted with cancel/confirm paths; another remains for
  future testing. Pin and ordinary local uploaded media remain blocked by
  QA-003; remove orphaned synthetic uploads when safe.
- Deeper multiplayer reconnect after a host leaves, page refresh during an
  answered question/result, an interrupted game plus second-session recovery,
  and host/player state synchronization. Waiting-room and active-question player
  refresh, late join, leave/rejoin, and duplicate nickname have been sampled.
  Continue with synthetic quizzes and records only.
- Exercise live Range and Puzzle gameplay more thoroughly, including pointer and
  keyboard Puzzle sorting with question timers long enough to separate tool
  latency from interaction behavior; test Range margins, near-miss scoring,
  Type Answer normalization, and empty-player game progression.
- Reproduce the earlier Results-tab redirect and test a naturally expired
  refresh token separately from the deliberately invalid synthetic token.
- Profile detail and password changes have successful saves; email change and
  account deletion remain untested. Google OAuth success/token exchange is
  blocked without a local provider stub and must not contact Google.
- Email verification/resend and password-reset completion are blocked while
  external email remains disabled. Use a local mail sink if available; never
  re-enable external SMTP for testing.
- Tablet/desktop checks beyond the 769×1024 editor and 1440×900 spot inspection;
  recheck editor breakpoints around 768–900px and more constrained layouts.
- Identify the observed anonymous 401 request and determine whether it is
  expected or a user-visible defect.

### Next-session guidance

1. Reconfirm the local app/API/database endpoints from checked-in development
   configuration before testing; don't run E2E setup/teardown against the
   development database.
2. If this browser profile persists, reuse only its synthetic account; otherwise
   establish a fresh synthetic account before authenticated mutations.
3. Start with host-leave and interrupted-game recovery, then run live Range and
   Puzzle retries with longer timers and investigate the remaining Results and
   refresh-token observations.
4. Append findings with the next unused `QA-NNN` identifier, sanitized browser
   evidence, and code references. Keep observations explicitly unconfirmed until
   reproduced and investigated.
