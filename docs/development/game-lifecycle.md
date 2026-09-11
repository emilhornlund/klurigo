# Backend Game Lifecycle

The backend persists one current task for each active game. Tasks follow the
same status progression, `pending` -> `active` -> `completed`, and completed
tasks advance in this order:

```text
LOBBY -> QUESTION -> QUESTION_RESULT -> LEADERBOARD -> QUESTION ... -> PODIUM
```

The final `QUESTION_RESULT` goes directly to `PODIUM`. Completing a podium sets
the game status to `COMPLETED` and deliberately leaves the podium as the
current task. `TERMINATED` is the host-quit state and `EXPIRED` is used by stale
game cleanup; both are terminal for lifecycle commands.

## Guarded Commands

- Joining is accepted only for an active game. The player limit, participant ID,
  and nickname are checked again while the game lock is held, so concurrent
  joins produce one participant and the existing controlled conflict errors.
- Task completion requires the current task to be active. Pending, completed,
  incompatible, and terminal states return a client error and do not publish a
  transition.
- Answers require the current active question. Redis records are scoped to the
  current task identity and one player can submit only once per question.
  Duplicate submissions return `400` with `Answer already provided`.
- Correct-answer add/delete commands require the current active
  `QUESTION_RESULT` task. The edit is rebuilt from the locked current document,
  so a stale request cannot replace a newer result task.
- Host quit requires an active game. Repeated or terminal quit requests return
  the existing not-found/controlled client error behavior and do not publish a
  second termination event.

Scheduled and manual transitions validate game status and the current task
identity (`_id`, type, and status) again at persistence time. A stale scheduled
job is discarded without changing the newer game document or publishing an
event. Persistence and infrastructure failures are propagated rather than
reported as successful commands.
