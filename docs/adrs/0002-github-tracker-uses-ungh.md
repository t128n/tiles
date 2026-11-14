# ADR 0002: The GitHub tracker reads ungh repositories and releases

Status: accepted · 2026-11-14 · Supersedes [0001](0001-github-events-over-ungh.md)

## Context

ADR 0001 chose GitHub's public events feed (`/users/{owner}/events/public`)
because it answers "releases" and "new repositories" in one request. In practice
the feed is far too sparse for the panel: the last 30 public events of
`vercel-labs` were all `MemberEvent`s, so the tracker rendered "Nothing recent"
on a freshly configured board even though the organisation shipped releases the
same day. The events endpoint only exposes the last 90 days of public activity
and only the event types GitHub chooses to publish.

`ungh.cc` (the proxy the person using the app suggested) exposes repositories
per owner and releases per repository, both CORS-open and cached.

## Decision

Read from ungh.cc:

- `GET /orgs/{owner}/repos`, falling back to `GET /users/{owner}/repos` on 404,
  for the repository list and its `createdAt`/`pushedAt`;
- `GET /repos/{owner}/{repo}/releases` for the **8 most recently pushed**
  repositories of each owner.

Keep items from the last **30 days**, merge and sort newest first, cap at 40, and
cache the result (items *and* errors) for ten minutes under
`localStorage["tiles:github:v1"]`, keyed by the owner set.

## Why

- It shows what the panel promises. `vercel-labs/ai` has releases from the same
  day; the events feed showed none.
- Repositories created recently come from `createdAt` in the repository list
  instead of a `CreateEvent` that may never appear in the 30-event window.
- One list request plus one release request per candidate repository is 9 requests
  per owner per refresh. ungh is a cached, unlimited proxy built for this, and the
  ten-minute cache keeps a normal day small.

## Consequences

- A release from a repository outside the eight most recently pushed ones is not
  shown until that repository is pushed again. That is the price of bounding the
  request count; the panel is a recent-activity window, not a complete archive.
- ungh is a third-party proxy. If it is down or changes shape, owners show a
  per-owner error, cached for ten minutes like any other result; the rest of the
  app is unaffected.
- The GitHub rate-limit handling from ADR 0001 no longer applies. Failures are
  ordinary HTTP errors and are reported per owner without retrying.
- Cached errors mean a typo'd owner does not trigger a request on every load; fix
  the owner or wait for the cache to expire.
