import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isGithubActions ? '/pr-status-dashboard' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
