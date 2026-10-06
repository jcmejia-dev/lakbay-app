import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers(){return [{source:'/notifications-sw.js',headers:[{key:'Cache-Control',value:'no-store, max-age=0'},{key:'Service-Worker-Allowed',value:'/'}]}];},
  // Resolve this project independently of sibling/parent package lockfiles.
  turbopack: {root: process.cwd()},
};

export default nextConfig;
