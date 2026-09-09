# Contributing to Klurigo

Thanks for taking the time to contribute. This guide covers the contribution
process and pull request expectations. It does not replace the current
development documentation or the coding-agent instructions in
[`AGENTS.md`](./AGENTS.md).

## Before You Start

- Read the [local development guide](./docs/getting-started/development.md) for
  prerequisites and the supported local workflow.
- Use the [development command reference](./docs/development/commands.md) for
  canonical build, test, lint, and validation commands.
- Treat [implementation plans](./docs/plans/) as planning material, not as the
  authority for shipped behavior.

## Contribution Process

1. Fork the repository and create a focused branch from `main`.
2. Keep changes focused and add or update tests for changed behavior.
3. Update current documentation when the user-facing behavior or contribution
   process changes.
4. Run the relevant checks, including the repository validation described in the
   [command reference](./docs/development/commands.md#repository-validation),
   before opening a pull request.

## Code of Conduct

This project follows a [Code of Conduct](./.github/CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.

## Contributor License Agreement

By submitting a pull request, you agree that your contributions are licensed
under the terms of the **Contributor License Agreement (CLA)** found in
[`CLA.md`](./CLA.md).

This agreement allows the project maintainer to use, modify, and relicense
contributions, including for commercial purposes, while you retain ownership
of your original work.

## Reporting Bugs

Use the [bug report template](./.github/ISSUE_TEMPLATE/bug_report.md) and
include:

- A clear description of the problem
- Steps to reproduce
- Expected and actual behavior
- Screenshots/logs if helpful

## Suggesting Features

Use the [feature request template](./.github/ISSUE_TEMPLATE/feature_request.md)
and describe:

- The problem you're trying to solve
- A clear description of the proposed feature
- Any alternatives considered

## Pull Request Process

- Follow the [pull request template](./.github/pull_request_template.md).
- Give the pull request a clear title; [Conventional Commits](https://www.conventionalcommits.org/)
  is encouraged.
- Include a summary of changes and link to any related issues.
- Make sure the relevant checks and tests pass.
- Keep PRs focused and small if possible.
- Only submit original work or code you have the legal right to contribute; do not include code from sources with incompatible licenses.

## Style Guide

- Use consistent formatting. We use Prettier and ESLint across the repo.
- Prefer descriptive names and comments where helpful.
- Avoid large formatting-only commits—keep code and formatting changes separate.
