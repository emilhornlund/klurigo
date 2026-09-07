# Testing

Klurigo uses three complementary test layers:

- **Unit tests** exercise isolated application logic. Backend unit tests use
  focused Nest testing modules and do not require the MongoDB or Redis test
  services.
- **Backend end-to-end tests** exercise the Nest application through its real
  modules and persistence integrations. They use the test MongoDB and Redis
  logical databases and run serially because suites reset shared state.
- **Frontend Playwright tests** exercise the Vite application and backend
  together in a browser. They reset and seed the same test databases before
  the run and cover browser-visible workflows, including game sessions.

The workspace test commands preserve these boundaries. `yarn test` runs the
common package, backend unit and e2e suites, and frontend unit tests. The
backend e2e portion therefore requires the local MongoDB and Redis services.

Detailed guidance:

- [Backend testing](./backend-testing.md) - Jest suites, test infrastructure,
  lifecycle cleanup, isolation, and coverage.
- [End-to-end testing](./end-to-end-testing.md) - Playwright setup, seeded
  fixtures, browser projects, GameSession execution, and CI behavior.

Use the [local infrastructure guide](../getting-started/local-infrastructure.md)
for Docker Compose service startup, ports, and the development/test database
names.
