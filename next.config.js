/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        http: false,
        https: false,
        url: false,
        net: false,
        tls: false,
        fs: false,
        deasync: false,
      };
    }
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('deasync');
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: [
      'http-cookie-agent',
      'tough-cookie',
      'axios',
      'cheerio',
    ],
  },
};

module.exports = nextConfig;