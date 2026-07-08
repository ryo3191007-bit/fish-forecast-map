# Requirements

## Product summary

Fishing forecast map helps users review fishing reports and understand where, when, and what species may be worth targeting.

The first goal is not to guarantee catches. The app provides reference information based on recent reports, seasonality, spots, species, and simple scoring rules.

## Target users

- Recreational anglers planning where to fish.
- Anglers who want to compare recent reports by species and area.
- Users who want a map-first view of fishing information.

## Core value

- See recent fishing reports on a map.
- Filter reports by species and area.
- Understand why a spot/species has a high or low reference score.
- Keep source attribution for fishing report information.

## MVP v0.1 functional requirements

- Show a top page with project summary and navigation.
- Show a fishing report list using mock data.
- Show fishing report cards with date, area, species, catch result, method, and source.
- Show a fishing report registration form using local/mock state first.
- Show a map screen with fishing report markers.
- Allow filtering by fish species.
- Calculate a simple explainable forecast/reference score.
- Show a disclaimer that scores do not guarantee catches.

## Non-functional requirements

- Keep monthly cost as close to zero as possible beyond existing ChatGPT Plus usage.
- Prefer free/open-source libraries.
- Keep implementation simple and maintainable.
- Avoid paid APIs until explicitly approved.
- Avoid storing secrets in the repository.
- Keep data policy visible in documentation.

## Future requirements

- Supabase/PostgreSQL persistence.
- Tide, weather, wind, wave, or sea-temperature data where legally usable and free.
- Fishing report ingestion from user-provided text or URLs.
- Permission-based or RSS/API-based fishing report ingestion.
- 2D depth or bathymetry layers.
- Optional 3D seafloor visualization.
