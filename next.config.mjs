import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!u) return undefined;
    return new URL(u).hostname;
  } catch {
    return undefined;
  }
})();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [35, 40, 45, 50, 55, 60, 75],
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1536, 1920],
    imageSizes: [16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: "https", hostname: "api.qrserver.com" },
      ...(supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : []),
    ],
  },
};

export default nextConfig;
