/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zrrqlmmecqfbobiblzkb.supabase.co',
        port: '', // Deixe vazio para portas padrão (80 para http, 443 para https)
        pathname: '/storage/v1/object/public/**', // Permite qualquer caminho dentro do bucket 'public' do storage
      },
      // Você pode adicionar mais patterns aqui para outros domínios de imagem se precisar
    ],
  },
};

export default nextConfig;
