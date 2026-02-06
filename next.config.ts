import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Empty turbopack config to silence warning - using webpack for better-sqlite3 compatibility
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle better-sqlite3 native module
      config.externals.push('better-sqlite3');
    }
    return config;
  },
};

export default nextConfig;
