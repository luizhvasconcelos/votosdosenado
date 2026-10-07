import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    return [{ source: "/backend/:path*", destination: `${backend}/:path*` }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.senado.leg.br" },
      { protocol: "https", hostname: "www25.senado.leg.br" }
    ]
  }
};

export default nextConfig;
