import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Montserrat,
  Inter,
} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import FloatingWhatsAppWrapper from "@/app/components/FloatingWhatsAppWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";
// import AOSInit from "./components/AOSInit";

// Declare as fontes aqui, todas juntas
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = {
  title: "Vem Pra Cá - Aproveite ofertas exclusivas perto de você!",
  description:
    "O Vem Pra Cá é o app perfeito para aproveitar promoções e serviços perto de você. Baixe agora!",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico", // Para alguns navegadores mais antigos e atalhos
    apple: "/favicon.ico", // Para iOS
  },
};

export default function RootLayout({ children }) {
  // Só mostra o botão nessas rotas:
  const allowedPaths = ["/", "/como-funciona", "/sobre", "/termos-de-uso"];
  // usePathname só funciona em Client Component, então precisamos de um wrapper
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${montserrat.variable}`}
    >
      <head>
        {/* <AOSInit /> */}
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-792WGGT77D"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-792WGGT77D');
          `}
        </Script>
      </head>
      <body className="scroll-smooth antialiased min-h-screen bg-white text-black flex flex-col">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <FloatingWhatsAppWrapper allowedPaths={allowedPaths} />
        <SpeedInsights />
      </body>
    </html>
  );
}
