# Architecture

## Initial architecture

MVP v0.1 should be implemented as a frontend-first web application using mock data.

Recommended stack:

- Frontend: Next.js + TypeScript.
- Styling: Tailwind CSS or simple CSS modules.
- Map: MapLibre GL JS or Leaflet.
- Data: local mock data first.
- CI: GitHub Actions for install, lint, typecheck, and build.

## Planned stages

### Stage 1: Mock-data MVP

- Static/mock fishing reports.
- Map markers.
- Species filter.
- Rule-based score.
- No database.
- No external scraping.

### Stage 2: Database persistence

- Supabase/PostgreSQL.
- Tables for fishing reports, fish species, fishing spots, sources, and forecast scores.
- Optional authentication later.

### Stage 3: Data enrichment

- Tide data where free and legally usable.
- Weather, wind, wave, or sea-temperature data where free and legally usable.
- User-provided URL/text extraction for fishing reports.

### Stage 4: Advanced visualization

- Bathymetry/depth layer.
- Seafloor topography layer.
- Optional 3D view using Three.js, deck.gl, or CesiumJS.

## Domain model draft

### FishingReport

- id
- reportDate
- areaName
- spotName
- latitude
- longitude
- speciesId
- speciesName
- catchCount
- sizeText
- resultLevel
- method
- sourceName
- sourceUrl
- notes

### FishSpecies

- id
- nameJa
- nameEn
- category
- seasonMonths

### FishingSpot

- id
- name
- areaName
- latitude
- longitude
- depthMeters
- spotType

### ForecastScore

- speciesId
- areaName or spotId
- score
- reasons
- calculatedAt

## Forecast score v1

The first forecast/reference score should be rule-based and explainable.

Example factors:

- Recent reports in the same area.
- Same species reports.
- Month/season fit.
- Spot historical weight from mock data.
- Optional method match.

The app should display reasons, not just the score.

## Future API/data notes

Do not add paid APIs or automated scraping without an approved Issue.
