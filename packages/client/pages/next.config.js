/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/:path*",
        destination: "/api/:path*",
      },
    ];
  },
  // Skip building TypeScript (we're doing it in our build command)
  typescript: {
    ignoreBuildErrors: true,
  },
};
