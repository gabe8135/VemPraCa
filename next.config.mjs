/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zrrqlmmecqfbobiblzkb.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // experimental: {}, // Nenhuma flag necessária para browsers modernos no Next.js 15+
};

export default nextConfig;
