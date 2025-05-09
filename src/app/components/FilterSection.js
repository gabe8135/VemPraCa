// src/app/components/FilterSection.js
'use client';

import { useState } from 'react';

export default function FilterSection({ availableFacilities, selectedFacilities, onChange }) {
  const [isOpen, setIsOpen] = useState(false); // Controla se a seção de filtros está expandida

  // Limita o número de filtros visíveis inicialmente
  const visibleCount = 4;
  const initiallyVisibleFacilities = availableFacilities.slice(0, visibleCount);
  const hiddenFacilities = availableFacilities.slice(visibleCount);

  return (
    <section id="filters" className="py-4 bg-gray-50"> {/* Fundo sutil */}
      <div className="container mx-auto px-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center md:text-left">
          Filtrar por Facilidades:
        </h3>
        <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-2">
          {/* Facilidades Visíveis Inicialmente */}
          {initiallyVisibleFacilities.map((facility) => (
            <div key={facility} className="flex items-center">
              <input
                type="checkbox"
                // Cria um ID único e válido substituindo espaços por hífens
                id={`filter-${facility.replace(/\s+/g, '-')}`}
                checked={selectedFacilities.includes(facility)}
                onChange={() => onChange(facility)}
                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
              />
              <label
                htmlFor={`filter-${facility.replace(/\s+/g, '-')}`}
                className="ml-2 text-sm text-gray-800 cursor-pointer select-none" // select-none evita seleção de texto ao clicar rápido
              >
                {facility}
              </label>
            </div>
          ))}

          {/* Facilidades Ocultas (se houver) */}
          {isOpen && hiddenFacilities.map((facility) => (
            <div key={facility} className="flex items-center">
              <input
                type="checkbox"
                id={`filter-${facility.replace(/\s+/g, '-')}`}
                checked={selectedFacilities.includes(facility)}
                onChange={() => onChange(facility)}
                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
              />
              <label
                htmlFor={`filter-${facility.replace(/\s+/g, '-')}`}
                className="ml-2 text-sm text-gray-800 cursor-pointer select-none"
              >
                {facility}
              </label>
            </div>
          ))}
        </div>

        {/* Botão Ver Mais/Menos (se houver filtros ocultos) */}
        {hiddenFacilities.length > 0 && (
          <div className="text-center md:text-left mt-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
              // Adiciona atributos de acessibilidade
              aria-expanded={isOpen}
              aria-controls="hidden-facilities-list" // Você pode adicionar um ID ao div que contém os filtros ocultos se quiser ser mais preciso
            >
              {isOpen ? 'Ver menos' : `Ver mais ${hiddenFacilities.length} opções`}
            </button>
          </div>
        )}
        {/* Div para o aria-controls (opcional) */}
        {/* <div id="hidden-facilities-list" className={isOpen ? '' : 'hidden'}></div> */}
      </div>
    </section>
  );
}
