# Documentation Task: Discovery Rails

## Scope

Create a permanent current-system page covering the authenticated discovery API
and UI. Document `GET /api/discover` and
`GET /api/discover/section/:key`, user-scope and `DISCOVERY` authority
requirements, snapshot hydration and ordering, section pagination and
`snapshotTotal`, the six rail keys, current eligibility and scoring, the
30-day trending window, twice-daily scheduling, singleton snapshots,
`DISCOVERY_SEED_ON_INIT` startup seeding, and the multi-instance startup caveat.
Document the protected `/discover` route, section route, search/filter fallback
to `GET /api/quizzes`, and the absence of `/discover/rails` and
`/discover/search` routes.

## Source References

- `packages/common/src/models/discovery.dto.ts`
- `packages/klurigo-service/src/modules/discovery-api/controllers/discovery.controller.ts`
- `packages/klurigo-service/src/modules/discovery-api/services/discovery-compute.service.ts`
- `packages/klurigo-service/src/modules/discovery-api/services/discovery-scheduler.service.ts`
- `packages/klurigo-service/src/modules/discovery-api/constants/`
- `packages/klurigo-service/src/modules/quiz-core/repositories/quiz.repository.ts`
- `packages/klurigo-service/src/modules/quiz-core/utils/discovery/discovery-scoring.utils.ts`
- `packages/klurigo-web/src/main.tsx`
- `packages/klurigo-web/src/pages/DiscoverRailsPage/`
- Discovery controller/compute/scheduler unit and e2e specs

## Historical Boundary

Use `docs/plans/discovery-rails.md` for phased rationale only. Do not copy its
old public-endpoint proposal, hard or soft inter-rail deduplication policy,
seven-day eligibility/scoring claims, backend section title/description fields,
or staging-route instructions as current behavior. The permanent page should
describe the current source contracts and operational behavior, not the phase
checklists.

## Intended Documentation Location

Create or update `docs/features/discovery-rails.md`, then link it from the
Features section of `docs/README.md`.
