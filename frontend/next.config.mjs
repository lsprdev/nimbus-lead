const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(publicBaseUrl ? { env: { NEXT_PUBLIC_BASE_URL: publicBaseUrl } } : {}),
  images: {
    unoptimized: true,
  },
}

export default nextConfig
