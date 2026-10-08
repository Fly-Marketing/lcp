import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allows Server Actions (login, claim, etc.) to work when the app is
      // accessed through a VS Code dev tunnel port forward instead of localhost.
      allowedOrigins: ["*.devtunnels.ms"],
    },
  },
};

export default nextConfig;
