// src/app/components/AOSInit.js
"use client";

import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

export default function AOSInit() {
useEffect(() => {
    // Adicionamos um setTimeout para garantir que a hidratação do React termine antes de a AOS modificar o DOM.
    const timer = setTimeout(() => {
      AOS.init({
        duration: 750, // Duração da animação em ms
        once: false,    // Se a animação deve acontecer sempre que o elemento entra na tela.
      });
    }, 100); // Um pequeno delay é suficiente.

    return () => clearTimeout(timer); // Limpamos o timer se o componente for desmontado.
}, []);

return null;
}
