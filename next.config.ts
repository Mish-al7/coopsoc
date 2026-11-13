import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos are resized in the browser before upload, but a full application
  // (photo + signature + 2 Aadhaar sides + extras) can still be a few MB.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  serverExternalPackages: ["mongoose", "sharp", "cloudinary"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
