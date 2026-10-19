import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // All illustrations are local SVGs (served as-is by next/image); logos are inline SVG.
    dangerouslyAllowSVG: false,
  },
};

export default nextConfig;
