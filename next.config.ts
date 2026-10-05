import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Resolve this project independently of sibling/parent package lockfiles.
  turbopack: {root: process.cwd()},
};

export default nextConfig;
