# Documentation Task: Anonymous Player Rating and Game Over

## Scope

Create a permanent current-system feature page for the player game-over event
and game-scoped quiz rating flow. Describe only observable shipped behavior:
the podium `GameOverPlayer` event and SSE/reconnect behavior, the
`PUT /api/games/:gameID/ratings` request and response, user versus anonymous
author persistence, update behavior, podium-only constraint, and authorization
rules including anonymous access and the quiz-owner restriction.

## Source References

- `packages/common/src/models/game-event.ts`
- `packages/klurigo-service/src/modules/game-event/utils/game-player-event.utils.ts`
- `packages/klurigo-service/src/modules/game-event/utils/game-over-event.utils.ts`
- `packages/klurigo-service/src/modules/game-event/services/game-participant-event.builder.ts`
- `packages/klurigo-service/src/modules/game-api/controllers/game-rating.controller.ts`
- `packages/klurigo-service/src/modules/game-api/services/game-rating.service.ts`
- `packages/klurigo-service/src/modules/quiz-core/repositories/models/schemas/quiz-rating-author.schema.ts`
- Relevant game-event and game-rating unit/e2e specs

## Historical Boundary

Use `docs/plans/anonymous-player-rating.md` only for rationale and delivery
history. Do not copy its implementation checklist, proposed file list, or
earlier read-endpoint ideas into the current page. Explicitly note that event
metadata is built through `GameParticipantEventBuilder` and that the existing
game authorization decorator is the player-token gate.

## Intended Documentation Location

Create or update `docs/features/anonymous-player-rating.md`, then link it from
the Features section of `docs/README.md`.
