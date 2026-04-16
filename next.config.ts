import type { NextConfig } from "next";

const supabaseHostname = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      ...(supabaseHostname ? [{ hostname: supabaseHostname }] : []),
    ],
  },
};

export default nextConfig;
