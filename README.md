# fish-forecast-map

Fishing forecast map is a web application for visualizing fishing reports, fishing spots, target fish species, and simple explainable forecast scores on a map.

The first version focuses on a small, low-cost MVP using mock data. Later versions may add Supabase, fishing report ingestion, tide/weather/sea-temperature data, and 3D seafloor visualization.

## MVP v0.1

MVP v0.1 will provide:

- A simple top page.
- Fishing report list.
- Fishing report cards or detail view.
- Fishing report registration form using mock/local state first.
- Map screen with report markers.
- Fish species filter.
- Simple explainable rule-based forecast score.
- Clear disclaimer that scores are reference information and do not guarantee catch.

## Out of scope for MVP v0.1

- External fishing-site scraping.
- 3D seafloor rendering.
- Paid APIs.
- Complex machine-learning prediction.
- Login/authentication.
- Production database writes.
- Reposting full third-party article text.

## Cost policy

Optimize in this order:

1. Stay within the user's existing ChatGPT Plus budget when possible.
2. Save tokens.
3. Maintain quality.
4. Improve productivity.

Do not introduce paid APIs, paid hosting, paid maps, or paid model inference unless explicitly approved.

## Development workflow

- ChatGPT acts as commander/project lead.
- Codex acts as implementation worker through GitHub Issues and Pull Requests.
- 1 task = 1 GitHub Issue = 1 Pull Request.
- Keep Pull Requests small and reviewable.
- Keep docs and implementation consistent.
- CI must pass before merge.

See `AGENTS.md` and `docs/CODEX_WORKFLOW.md` for details.

## Legal and data caution

Fishing report data from shops, blogs, SNS, or news sites must respect terms, robots.txt, copyright, and access load. Store extracted facts and source URLs, not full article copies.

## Local development

Application code has not been created yet.

Expected future commands:

```bash
npm install
npm run dev
npm run lint
npm run build
```
