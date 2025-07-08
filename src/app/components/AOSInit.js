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
        duration: 600, // Duração da animação um pouco mais curta para ser mais rápido.
        once: true,    // ESSENCIAL: A animação acontece apenas UMA VEZ. Isso corrige os travamentos ao rolar.
        // disable: 'mobile' 
      });
    }, 100); // Um pequeno delay é suficiente.

    return () => clearTimeout(timer); // Limpamos o timer se o componente for desmontado.
}, []);

return null;
}
