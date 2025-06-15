/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  serverExternalPackages: [],
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    // ⚠️ تعطيل فحص أنواع TypeScript أثناء البناء
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ تعطيل فحص ESLint أثناء البناء
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
