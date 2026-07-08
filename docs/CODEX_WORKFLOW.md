# Codex Workflow

## Purpose

This project uses GitHub Issues and Pull Requests as the command interface for Codex.

ChatGPT acts as commander/project lead. Codex acts as implementation worker.

## Standard workflow

1. ChatGPT creates or drafts a GitHub Issue.
2. The Issue describes one small task.
3. Codex is invoked from the Issue or PR when available.
4. Codex opens a Pull Request.
5. ChatGPT reviews the PR and CI result.
6. If needed, ChatGPT posts a follow-up instruction such as a fix request.
7. Human owner gives final approval before merge.

## Task size rule

1 task = 1 Issue = 1 Pull Request.

Do not bundle unrelated features, refactors, UI changes, and infrastructure changes into one PR.

## Issue format

Each implementation Issue should include:

- Purpose.
- Background.
- Scope.
- Out of scope.
- Implementation notes.
- Acceptance criteria.
- Codex instruction.

## PR expectations

Each PR should include:

- What changed.
- Why it changed.
- Screenshots for UI changes when possible.
- How to test.
- Known limitations.
- Whether docs were updated.

## Review policy

ChatGPT reviews:

- Scope control.
- Docs consistency.
- UI/UX consistency.
- Data policy compliance.
- Cost policy compliance.
- CI/build status.

Claude/Gemini or other AI reviewers may be used only for important design, data policy, or UX reviews.

## Token-saving policy

- Keep Issues focused.
- Keep docs as the source of truth.
- Avoid repeating full project context in every prompt.
- Prefer mock data and small PRs early.
- Use Codex for implementation, not broad product brainstorming.
- Use external AI reviewers only when their review is expected to add value.

## Example Codex instruction

```text
@codex Please implement this Issue in a small PR. Read AGENTS.md and the relevant docs first. Keep the change scoped to this Issue. Ensure lint/typecheck/build pass.
```
