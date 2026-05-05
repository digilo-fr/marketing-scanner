import type { NextConfig } from "next";

const config: NextConfig = {
  // Heavy/native packages must stay external (not bundled by webpack)
  serverExternalPackages: ["@react-pdf/renderer", "googleapis"],
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default config;
