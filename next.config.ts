import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  // serverless functions can be long for an audit
  serverRuntimeConfig: { maxDuration: 300 },
};

export default config;
