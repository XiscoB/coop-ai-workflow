import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingIncludes: {
    "/api/runs/[id]/advance": ["./sandbox/**"],
    "/api/sandbox/reset": ["./sandbox/**"],
  },
};

export default nextConfig;
