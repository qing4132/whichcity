import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./public/fonts/**/*", "./public/data/**/*"],
  },
};

export default nextConfig;
