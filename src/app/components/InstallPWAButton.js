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
    setIsStandalone(
      mq.matches || isIOSStandalone || window.__pwaInstalled === true
    );

    // Usa evento capturado cedo se existir
    if (window.__deferredPWA) {
      setDeferredPrompt(window.__deferredPWA);
      setCanInstall(true);
    }

    const onBIP = () => {
      if (window.__deferredPWA) {
        setDeferredPrompt(window.__deferredPWA);
        setCanInstall(true);
      }
    };
    const onInstalled = () => {
      setIsStandalone(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("pwa:beforeinstallprompt", onBIP);
    window.addEventListener("pwa:installed", onInstalled);
    return () => {
      window.removeEventListener("pwa:beforeinstallprompt", onBIP);
      window.removeEventListener("pwa:installed", onInstalled);
    };
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

    if (!deferredPrompt && window.__deferredPWA) {
      setDeferredPrompt(window.__deferredPWA);
    }
    if (!deferredPrompt && !window.__deferredPWA) {
      // Alguns browsers instalam via UI do navegador (ou o evento já passou). Damos uma dica.
      alert("Use o menu do navegador para instalar o app.");
      return;
    }
    const e = deferredPrompt || window.__deferredPWA;
    e.prompt();
    const choice = await e.userChoice;
    if (choice.outcome !== "dismissed") {
      setCanInstall(false);
      setDeferredPrompt(null);
      window.__deferredPWA = null;
    }
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
