import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET;
    if (!apiTarget) return [];
    const apiPath = process.env.API_PROXY_PATH ?? '/api/review';
    return [
      {
        source: '/api/review/:path*',
        destination: `${apiTarget}${apiPath}/:path*`,
      },
    ];
  },
};

export default nextConfig;
