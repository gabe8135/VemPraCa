import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { inter } from '@/app/ui/fonts';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "VemPraCá🡵",
  description: "Tudo que voce precisa em um só lugar",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
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
