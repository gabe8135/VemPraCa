import { Inter } from 'next/font/google';
// app/ui/fonts.ts
import { Playfair_Display } from "next/font/google";

export const playfair = Playfair_Display({
subsets: ["latin"],
weight: ["400", "700"],
variable: "--font-playfair",
display: "swap",
});

export const inter = Inter({ subsets: ['latin'] });