---
life_pm_format: "1.0"
type: session_export
module_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
module: Token refresh
project: Auth refactor
domain: IMS
stage: spec
status: in_progress
session_date: 2026-08-28
sign_off: false
summary: Refresh token rotation for mobile web sessions
---

## Summary

Implement silent refresh token rotation on mobile web so sessions survive background tab suspension without user-visible logout.

## Requirements

- Issue short-lived access tokens (15 min) and long-lived refresh tokens (30 days)
- Refresh endpoint returns new access + refresh token pair (rotation)
- Client proactively refreshes 2 min before access token expiry
- On refresh failure, show re-login modal — never silent logout mid-form
- Log all refresh failures server-side with user agent and error code

## Acceptance criteria

1. User on mobile Safari can complete checkout after 30+ minutes with tab backgrounded
2. Expired access token triggers automatic refresh without page reload
3. Invalid/revoked refresh token shows login modal within 2 seconds
4. Refresh endpoint returns 401 for revoked tokens (not 500)
5. No regression on existing v1 token clients (API contract unchanged)

## Edge cases

- User opens two tabs simultaneously — both attempt refresh (race condition)
- Refresh token expires while user is filling a long form
- Network offline during proactive refresh — queue and retry vs immediate modal
- Server clock skew causes premature "expired" on client

## Verification plan

| Criterion | Proof |
|-----------|-------|
| AC1 — checkout after 30 min | Manual: background tab 35 min, complete checkout on staging |
| AC2 — auto refresh | Unit test: `tokenRefresh.test.ts` mocks expiry, asserts silent refresh |
| AC3 — login modal | E2E: revoke refresh token in DB, assert modal appears < 2s |
| AC4 — 401 not 500 | Integration test: `POST /auth/refresh` with revoked token → 401 |
| AC5 — v1 clients | Run existing mobile app smoke tests against staging |

## Locked decisions

- 2026-08-28 — Use rotation (new refresh token on each refresh), not reuse
- 2026-08-28 — Proactive refresh at T-2min, not on 401 response

## Open questions

- Should we debounce concurrent refresh requests across tabs (SharedWorker)?

## Stage checklist

- [x] Requirements
- [x] Acceptance criteria (min 3)
- [x] Edge cases (min 2)
- [x] Verification plan
- [ ] Sign-off
