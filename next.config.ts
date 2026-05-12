import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET;
    if (!apiTarget) return [];
    return [
      {
        source: '/api/review/:path*',
        destination: `${apiTarget}/api/review/:path*`,
      },
    ];
  },
};

export default nextConfig;
