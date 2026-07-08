# AGENTS.md

## Project

This repository contains a fishing forecast map web application.

The goal is to visualize fishing reports, fishing areas, fish species, and simple forecast scores on a map. The app may eventually support seafloor/topography layers and structured ingestion of fishing report articles, but the MVP must stay small and cheap.

## Roles

- Human owner: final approval and product direction.
- ChatGPT: commander/project lead. Responsible for requirements, task decomposition, issue text, review, and merge recommendations.
- Codex: implementation worker. Works from GitHub Issues and Pull Requests.
- Claude/Gemini or other AI reviewers: optional review support for important design, data policy, and UX decisions only.

## Cost priorities

Optimize in this order:

1. Monthly cost within the user's existing ChatGPT Plus budget when possible.
2. Token savings.
3. Quality.
4. Productivity.

Avoid paid APIs, paid hosting, paid maps, and paid model inference unless explicitly approved in an Issue.

## Workflow

- 1 task = 1 GitHub Issue = 1 Pull Request.
- Do not bundle unrelated changes.
- Read this file and the relevant files under `docs/` before editing.
- Keep implementation aligned with the docs.
- If implementation and docs disagree, update the docs or ask for clarification in the PR.
- Keep PRs small enough to review.
- Ensure lint/build/typecheck/test pass before marking work ready.

## Current MVP rules

For MVP v0.1:

- Use mock data first.
- Do not implement external fishing-site scraping yet.
- Do not implement 3D seafloor rendering yet.
- Do not implement paid APIs.
- Do not implement complex machine-learning prediction yet.
- Use a simple, explainable rule-based score.
- Store source attribution for fishing reports.
- Do not republish full third-party article text.

## Recommended tech stack

- Frontend: Next.js + TypeScript.
- Styling: Tailwind CSS or simple CSS modules.
- Map: MapLibre GL JS or Leaflet for the first map implementation.
- Database: Supabase/PostgreSQL later; mock data first.
- CI: GitHub Actions for install, lint, typecheck, and build.
- Future 3D: Three.js, deck.gl, or CesiumJS.

## Code style

- Prefer TypeScript types for domain entities.
- Keep UI components small and readable.
- Keep domain logic separated from UI.
- Add comments only where they clarify non-obvious logic.
- Do not hard-code secrets.
- Do not commit `.env` files.

## Domain terms

- Fishing report: observed catch information.
- Fishing spot: a point or area where fishing happened or is predicted.
- Fish species: target species such as tuna, yellowtail, horse mackerel, mackerel, dolphinfish, or alfonsino.
- Forecast score: explainable reference score, not a guarantee of catch.
- Source: URL or manually entered attribution for a fishing report.

## Data safety and legal constraints

Fishing report data from shops, blogs, SNS, or news sites must be treated carefully.

- Respect site terms, robots.txt, copyright, and access load.
- Prefer manual entry, RSS, official APIs, or permission-based sources.
- Store extracted facts and source URLs, not full article copies.
- Show clear attribution.
- Do not claim the app guarantees fishing results.

## Pull Request expectations

Each PR should include:

- What changed.
- Why it changed.
- Screenshots for UI changes when possible.
- How to test.
- Known limitations.
- Whether docs were updated.

## Prohibited unless explicitly approved

- Paid API integration.
- Automated high-frequency scraping.
- Reposting full third-party fishing articles.
- Collecting precise user location without consent.
- Storing secrets in the repository.
- Large architecture rewrites without an Issue.
