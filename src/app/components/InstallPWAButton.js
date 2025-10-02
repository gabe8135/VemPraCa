"use client";

import { useEffect, useState } from "react";

export default function InstallPWAButton({ className = "" }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detecta se já está instalado (standalone)
    const mq = window.matchMedia("(display-mode: standalone)");
    const isIOSStandalone = window.navigator.standalone === true;
    setIsStandalone(mq.matches || isIOSStandalone);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleClick = async () => {
    // iOS não suporta prompt programático — mostrar instruções simples
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isiOS = /iphone|ipad|ipod/i.test(ua);
    if (isiOS) {
      alert(
        "Para adicionar à tela inicial no iOS: toque em Compartilhar (ícone quadrado com seta) e depois em 'Adicionar à Tela de Início'."
      );
      return;
    }

    if (!deferredPrompt) {
      // Alguns browsers instalam via UI do navegador, então deixe uma dica
      alert(
        "Se o seu navegador suportar, use o menu do navegador para 'Instalar aplicativo' ou 'Adicionar à tela inicial'."
      );
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome !== "dismissed") setCanInstall(false);
    setDeferredPrompt(null);
  };

  if (isStandalone) return null; // Se já está instalado, não exibe

  return (
    <button
      onClick={handleClick}
      className={
        className ||
        "bg-white text-green-800 px-4 py-1 rounded-full font-semibold w-auto transition hover:bg-[#F0B100] whitespace-nowrap"
      }
    >
      Instalar
    </button>
  );
}
