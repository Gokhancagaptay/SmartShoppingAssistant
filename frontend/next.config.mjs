import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Üst klasörde ek package-lock olduğunda Turbopack kökünü frontend olarak sabitle (.env.local için).
  turbopack: {
    root: __dirname,
  },
  // Docker production build için standalone output
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  // FastAPI backend'ine API isteklerini proxy'ler.
  // /api/* ile başlayan tüm istekler doğrudan localhost:8000'e yönlendirilir.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
}

export default nextConfig
