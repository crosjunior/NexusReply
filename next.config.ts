import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**.cdninstagram.com" }, { protocol: "https", hostname: "**.fbcdn.net" }] },
  // build autocontido para Docker/VPS (.next/standalone)
  output: "standalone",
};

export default nextConfig;
