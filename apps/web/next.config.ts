import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.senado.leg.br" },
      { protocol: "https", hostname: "www25.senado.leg.br" }
    ]
  }
};

export default nextConfig;
