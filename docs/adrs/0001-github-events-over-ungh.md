# ADR 0001: GitHub activity comes from the public events feed, not ungh.cc

Status: superseded by [0002](0002-github-tracker-uses-ungh.md) · 2026-11-14

## Context

The GitHub tracker experiment lists recent releases and newly created
repositories for a configured set of users and organisations. GitHub's public
REST API is CORS-open and works without a token, but unauthenticated requests
are limited to 60 per hour per IP. `https://ungh.cc` was proposed as an
unlimited, cached proxy.

## Decision

Read `https://api.github.com/users/{owner}/events/public?per_page=30` once per
owner, cache the mapped items in `localStorage["tiles:github:v1"]` for ten
minutes, and cap the owner list at ten. Do not use ungh.cc.

## Why

- The events feed answers both questions with **one** request: `ReleaseEvent`
  and `CreateEvent` (with `ref_type: "repository"`) are the only types the
  tracker keeps. A fresh feed of two owners costs two requests.
- ungh.cc has repo, release, org and user routes but **no events route**, so the
  same list would need one repository list plus one release call per repository
  — a dozen or more requests per owner through a shared community service.
- One fewer third-party dependency in a local-first app: no new domain to trust,
  and a failure mode (rate limit) that is already understood.

## Consequences

- At the ten-minute refresh interval, two owners cost 12 requests per hour and
  ten owners cost 60 — the cap keeps the worst case at the unauthenticated
  budget. Cached loads cost nothing.
- A 403 or 429 shows a rate-limit message instead of retrying, so the budget is
  never burned in a loop.
- Public events only cover the last 90 days and only public activity; that is
  acceptable for a "what shipped recently" panel.
- If repository-level data is ever needed (stars, contributors), ungh.cc remains
  the natural source for that endpoint, and nothing in this decision prevents
  adding it for that purpose.
