# Data Policy

## Purpose

This project may use fishing report data from shops, blogs, SNS, official announcements, user submissions, or other public sources in the future.

The MVP starts with mock data and manual entry to avoid legal, copyright, and access-load risks.

## Core principles

- Respect website terms of service.
- Respect robots.txt where applicable.
- Respect copyright.
- Avoid unnecessary access load.
- Prefer official APIs, RSS, permission-based sources, or user-provided text/URLs.
- Store extracted facts and source URLs, not full article copies.
- Show source attribution clearly.
- Do not claim the app guarantees fishing results.

## Allowed for MVP v0.1

- Mock fishing report data.
- Manually entered report data.
- Source name and source URL fields.
- Short factual summaries created by the user.

## Not allowed for MVP v0.1

- Automated high-frequency scraping.
- Reposting full third-party article text.
- Copying images from third-party sites.
- Circumventing access controls.
- Paid data APIs without explicit approval.

## Future ingestion approach

When ingestion is added later, prefer this order:

1. Official APIs.
2. RSS feeds.
3. Permission-based partner sources.
4. User-provided URL/text extraction.
5. Low-frequency crawling only when legally and technically acceptable.

## Data fields to store

Store structured facts such as:

- Report date.
- Area or spot name.
- Approximate latitude/longitude when available and appropriate.
- Fish species.
- Catch count or result level.
- Size or weight.
- Fishing method.
- Source name.
- Source URL.
- Created/updated timestamp.

Avoid storing:

- Full article body from third-party sites.
- Third-party images.
- Personal data not needed for the app.
- Precise user location without consent.

## Disclaimer language

The app should display a disclaimer similar to:

> Forecast scores are reference information based on available reports and simple rules. They do not guarantee fishing results.
