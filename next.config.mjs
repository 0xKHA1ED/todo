const isProd = process.env.NODE_ENV === 'production'
const repoBasePath = process.env.NEXT_PUBLIC_BASE_PATH || (isProd ? '/todo' : '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: repoBasePath,
  assetPrefix: repoBasePath ? `${repoBasePath}/` : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
}

export default nextConfig
