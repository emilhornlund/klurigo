# Documentation Task: User Profiles

## Scope

Create a permanent current-system page for the authenticated profile API and
frontend. Cover both `/api/users/:userId/profile` and
`/api/users/:userId/quizzes`, their user-scope and `Authority.User`
requirements, profile statistics, not-found behavior, public-only quiz
pagination, supported sorting and defaults, and reuse of the existing
paginated quiz response. Cover `/users/:userId/profile`,
`/users/:userId/quizzes`, quiz-card mapping, the self-profile menu entry, and
the currently supported nickname-link surfaces. State that the profile API is
not anonymous and that the discovery-card author is currently plain text.

## Source References

- `packages/klurigo-service/src/modules/user-profile-api/controllers/public-user.controller.ts`
- `packages/klurigo-service/src/modules/user-profile-api/services/user-profile.service.ts`
- `packages/klurigo-service/src/modules/user-profile-api/controllers/`
- `packages/klurigo-service/src/modules/user-profile-api/services/*.spec.ts`
- `packages/klurigo-web/src/main.tsx`
- `packages/klurigo-web/src/pages/UserProfilePage/`
- `packages/klurigo-web/src/pages/UserQuizzesPage/`
- `packages/klurigo-web/src/utils/quiz.utils.ts`
- `packages/klurigo-web/src/components/Page/Page.tsx`
- `packages/klurigo-web/src/pages/GameResultsPage/`

## Historical Boundary

Use `docs/plans/user-profile.md` for implementation rationale and sequencing
only. Do not copy its task checklist into the current page or claim that every
nickname with an ID is linked. In particular, preserve the distinction between
the menu label `Profile` and the plan's historical wording "My Profile", and
verify link surfaces against the current components.

## Intended Documentation Location

Create or update `docs/features/user-profiles.md`, then link it from the
Features section of `docs/README.md`.
