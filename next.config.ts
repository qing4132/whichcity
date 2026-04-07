import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const devPort = process.env.PORT || "3000";

const nextConfig: NextConfig = {
  distDir: isDevelopment ? `.next-dev-${devPort}` : ".next",
  outputFileTracingIncludes: {
    "/*": ["./public/fonts/**/*", "./public/data/**/*"],
  },
};

export default nextConfig;
