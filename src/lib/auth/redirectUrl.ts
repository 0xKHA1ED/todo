export function getAuthRedirectUrl(path: string, origin: string, basePath: string): string {
  const prefix = `/${basePath.replace(/^\/|\/$/g, '')}`.replace(/^\/$/, '')
  const trimmed = path.replace(/^\/|\/$/g, '')
  return `${origin.replace(/\/$/, '')}${prefix}/${trimmed}/`
}

export function getClientAuthRedirectUrl(path: string): string {
  const origin = window.location.origin
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
  return getAuthRedirectUrl(path, origin, basePath)
}
