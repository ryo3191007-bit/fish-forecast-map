# MVP Scope

## MVP v0.1 goal

Build the smallest useful version of the fishing forecast map app with mock data.

The purpose is to validate the product flow and UI before adding database, data ingestion, prediction sophistication, or 3D visualization.

## In scope

- Next.js + TypeScript web app.
- Mock fishing report data.
- Top page.
- Fishing report list.
- Fishing report card or detail-style display.
- Fishing report registration form using mock/local state first.
- Map screen with report markers.
- Fish species filter.
- Simple explainable rule-based forecast score.
- Disclaimer that scores are reference information and do not guarantee catch.
- Basic CI for lint/typecheck/build.

## Out of scope

- External fishing-site scraping.
- Automated article ingestion.
- 3D seafloor rendering.
- Paid APIs.
- Complex machine-learning prediction.
- Login/authentication.
- Production database writes.
- Mobile app release.
- Reposting full third-party article text.

## Initial target area

The initial sample area is Sagami Bay and nearby coastal areas.

This can be represented with mock coordinates first. Exact spot accuracy is not required for MVP v0.1.

## Initial fish species examples

- Yellowfin tuna / キハダ
- Skipjack tuna / カツオ
- Yellowtail / ブリ・ワラサ
- Horse mackerel / マアジ
- Mackerel / サバ
- Dolphinfish / シイラ
- Alfonsino / キンメダイ

## MVP success criteria

- A user can open the app and understand the concept quickly.
- A user can view mock fishing reports in list and map form.
- A user can filter by species.
- A user can see a reference score and understand its reason.
- The app can be extended later without rewriting everything.
