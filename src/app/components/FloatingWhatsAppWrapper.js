"use client";
import FloatingWhatsApp from "./FloatingWhatsApp";
import { usePathname } from "next/navigation";

export default function FloatingWhatsAppWrapper({ allowedPaths }) {
  const pathname = usePathname();
  const show = allowedPaths.includes(pathname);
  if (!show) return null;
  return (
    <FloatingWhatsApp
      phoneNumber="13997399924"
      message="Olá! Vi o VemPraCá e gostaria de mais informações sobre como cadastrar meu negócio ou fazer uma parceria."
    />
  );
}
