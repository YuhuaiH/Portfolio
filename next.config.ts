import type { NextConfig } from "next";

const repoName = "Portfolio";
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

const basePath = isGithubActions ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath,
  assetPrefix: isGithubActions ? `/${repoName}/` : "",
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
