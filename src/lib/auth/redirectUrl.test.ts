import { describe, expect, it } from 'vitest'
import { getAuthRedirectUrl } from './redirectUrl'

describe('getAuthRedirectUrl', () => {
  it('joins origin, base path, and a trailing-slash path', () => {
    expect(getAuthRedirectUrl('/reset-password', 'http://localhost:3000', '')).toBe(
      'http://localhost:3000/reset-password/',
    )
    expect(getAuthRedirectUrl('/auth/callback', 'https://example.github.io', '/todo')).toBe(
      'https://example.github.io/todo/auth/callback/',
    )
  })

  it('tolerates a base path with or without slashes', () => {
    expect(getAuthRedirectUrl('auth/callback', 'https://x.github.io', 'todo')).toBe(
      'https://x.github.io/todo/auth/callback/',
    )
  })
})
