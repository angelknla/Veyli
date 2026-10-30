module.exports = {
  reactStrictMode: true,
  distDir: process.env.VEYLI_INTEGRATION_DATABASE ? '.next-e2e' : process.env.VEYLI_BUILD_DIRECTORY || '.next',
  serverExternalPackages: ['@electric-sql/pglite'],
  experimental: { serverActions: { bodySizeLimit: '6mb' }, turbopackFileSystemCacheForBuild: false },
  images: { formats: ['image/avif', 'image/webp'], deviceSizes: [640,750,828,1080,1200,1920], imageSizes: [16,32,48,64,96,128,256,384], qualities: [75,80,85], maximumResponseBody: 5 * 1024 * 1024 },
  redirects: () => {
    return [{ source: '/today', destination: '/', permanent: true }];
  },
  headers: async () => { return [{ source: '/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }] }]; },
};
