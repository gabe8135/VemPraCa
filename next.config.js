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

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.qrserver.com" },
      ...(supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : []),
    ],
  },
};

module.exports = nextConfig;
