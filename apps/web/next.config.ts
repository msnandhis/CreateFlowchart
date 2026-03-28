import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages
  transpilePackages: [
    "@createflowchart/core",
    "@createflowchart/ai",
    "@createflowchart/db",
  ],

  // Standalone output for Docker deployment
  output: "standalone",

  // Turbopack config
  turbopack: {
    root: "../../", // Monorepo root
  },

  // Server-only packages that shouldn't be bundled for edge/client
  serverExternalPackages: ["pg", "ioredis", "bullmq"],
};

export default nextConfig;
