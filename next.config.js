/** @type {import('next').NextConfig} */
const nextConfig = {
  // appDir is now stable in Next.js 14
  images: {
    domains: ['pbs.twimg.com', 'abs.twimg.com'],
  },
}

module.exports = nextConfig
