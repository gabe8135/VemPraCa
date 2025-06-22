import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { inter } from '@/app/ui/fonts';
import { SpeedInsights } from "@vercel/speed-insights/next"
import AOSInit from "./components/AOSInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Vem Pra Cá - Aproveite ofertas exclusivas perto de você!",
  description: "O Vem Pra Cá é o app perfeito para aproveitar promoções e serviços perto de você. Baixe agora!",
  icons: {
    icon: '/favicon.ico', 
    shortcut: '/favicon.ico', // Para alguns navegadores mais antigos e atalhos
    apple: '/favicon.ico', // Para iOS
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <AOSInit />
  <body className={`${inter.className} scroll-smooth antialiased geistSans.variable geistMono.variable`}>
    <div className="min-h-screen bg-white text-black">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  </body>
</html>

  );
}
