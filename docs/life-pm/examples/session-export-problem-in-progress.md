---
life_pm_format: "1.0"
type: session_export
module_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
module: Token refresh
project: Auth refactor
domain: IMS
stage: problem
status: in_progress
session_date: 2026-08-26
sign_off: false
summary: Mobile users lose sessions silently during checkout
---

## Summary

Mobile web users are logged out without warning mid-checkout, causing abandoned carts and support tickets.

## Problem statement

Mobile web users lose their authenticated session without warning during multi-step flows (especially checkout), causing data loss and abandoned purchases. The system fails silently rather than prompting re-authentication.

## Who

- End users on mobile web (primarily iOS Safari)
- Customer support team handling "I was logged out" tickets
- Engineering team maintaining the auth service

## Pain

- 3 support tickets in the past week citing unexpected logout
- Checkout completion rate on mobile dropped ~12% over the last month
- Users re-enter cart data after session loss, then abandon
- No logging when sessions expire client-side — hard to diagnose

## Why now

- Support ticket spike this week
- Release freeze in 3 weeks — need fix before then
- Mobile checkout is a Q3 OKR for the product team

## Constraints

- Cannot break the existing REST API contract (mobile app still on v1 tokens)
- Must ship within 2 weeks (before release freeze)
- No new third-party auth provider in this iteration

## Not solving

- OAuth provider migration (Google/Apple sign-in)
- Admin panel session management
- Native iOS/Android app auth (separate codebase)

## Locked decisions

- (none this session)

## Open questions

- Is this iOS Safari only, or all mobile browsers?
- Are expired sessions server-side TTL or client-side token handling?

## Stage checklist

- [x] Problem statement
- [x] Who
- [x] Pain
- [x] Why now
- [x] Constraints
- [x] Not solving (min 2)
- [ ] Sign-off
