import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Logos rarely change: let browsers keep them for a week instead of asking every time
        source: "/:file(logo-white.png|logo-dark.png)",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        // Launch screen and iPhone launch images
        source: "/:path(launch.html|splash/.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
