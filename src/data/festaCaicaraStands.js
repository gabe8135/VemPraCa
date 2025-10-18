// src/data/festaCaicaraStands.js
// Definição dos 10 estandes da IX Festança Caiçara (exemplo). Ajuste nomes/descrições conforme necessário.

export const festaEditionYear = 2025;

export const stands = [
  {
    slug: "sabor-do-oriente",
    nome: "Sabor do Oriente",
    proprietario: "Sergio Kataguiri",
    descricao: "Culinária oriental com toque caiçara.",
    pratoPrincipal: "Yakissoba de camarão com molho de cataia",
    itens: [
      "Outros pratos inspirados na culinária oriental com elementos tradicionais caiçaras",
    ],
  },
  {
    slug: "delicias-do-mar",
    nome: "Delícias do Mar",
    proprietario: "Eliane Lisboa",
    descricao: "Sabores do mar com ingredientes locais.",
    pratoPrincipal: "Delícia do Mar (arroz com palmito e molho de ostra)",
    itens: ["Porções: robalo, pescada, pastel de ostra"],
  },
  {
    slug: "rota-da-praia",
    nome: "Rota da Praia",
    proprietario: "Larissa Nogueira",
    descricao: "Quitutes e pratos com frutos do mar.",
    pratoPrincipal: "Maenga do Céu (tapioca de camarão com queijo)",
    itens: ["Porções diversas", "Empada de camarão", "Bolo no pote"],
  },
  {
    slug: "point-dos-amigos",
    nome: "Point dos Amigos",
    proprietario: "Helena Nazil",
    descricao: "Receitas tradicionais caiçaras e petiscos.",
    pratoPrincipal: "Caldeirada Caiçara (frutos do mar)",
    itens: ["Pastéis: banana, siri e camarão", "Porções diversas"],
  },
  {
    slug: "cantinho-da-jane",
    nome: "Cantinho da Jane",
    proprietario: "Jane Lisboa",
    descricao: "Pratos e porções com frutos do mar.",
    pratoPrincipal: "Camarão Tropical (ceviche de camarão na taça)",
    itens: [
      "Siri mole",
      "Camarão alho e óleo",
      "Isca de pescada",
      "Porções em geral",
    ],
  },
  {
    slug: "patrao-chopp",
    nome: "Patrão Chopp",
    proprietario: "Wagner Silva",
    descricao: "Menu completo com entrada, principal e sobremesa.",
    itens: [
      "Entrada: Azulão - Casquinha de siri azul (carne de siri desfiada, ervas, azeite de dendê, leite de coco)",
      "Principal: Moqueca de manjuba na folha de bananeira",
      "Sobremesa: Delícia de banana (sorvete de banana com leite de búfala e calda de banana caramelizada)",
    ],
  },
  {
    slug: "restaurante-maisa",
    nome: "Restaurante Maísa",
    proprietario: "Maísa Lisboa",
    descricao: "Prato feito caiçara e porções.",
    pratoPrincipal:
      "Caiçarinha (arroz, farofa de banana, filé de pescada ao molho de camarão, pirão de peixe)",
    itens: ["Porções diversas"],
  },
  {
    slug: "magia-dos-sabores",
    nome: "Magia dos Sabores",
    proprietario: "Sellane Castro",
    descricao: "Prato principal e sobremesas",
    pratoPrincipal:
      "Paella de Frutos do Mar, preparada com arroz cozido em um rico caldo, aromatizado com açafrão e especiarias, e generosamente guarnecido com camarões suculentos, lulas macias e mexilhões frescos.",
    itens: ["Sobremesa: Cataia Doce (pudim de cataia com calda de cataia)"],
  },
  {
    slug: "boteko-da-vila",
    nome: "Boteko da Vila",
    proprietario: "Lucila dos Santos",
    descricao: "Peixe assado na brasa e porções do mar.",
    pratoPrincipal:
      "Tainha na Brasa (meia tainha assada na brasa com cobertura de vinagrete)",
    itens: [
      "Bolinho de mandioca com camarão",
      "Espetinhos de frutos do mar",
      "Porções diversas",
    ],
  },
  {
    slug: "rancho-alegre",
    nome: "Rancho Alegre",
    proprietario: "Edison da Silva",
    descricao: "Baião Caiçara, porções em geral, bebidas e refeições.",
    pratoPrincipal: "Baião Caiçara",
    itens: ["Porções em geral", "Bebidas", "Refeições"],
  },
  {
    slug: "espaco-crianca",
    nome: "Espaço Criança",
    proprietario: "Márcia Moraes",
    descricao: "Atividades infantis e guloseimas para as crianças.",
    pratoPrincipal: "Pipoca e algodão doce",
    itens: [
      "Atividades: pintura corporal com temas locais, pula-pula, piscina de bolinhas",
      "Livro de colorir com espaços e paisagens de Pedrinhas",
    ],
  },
];

export function getStandBySlug(slug) {
  if (!slug) return null;
  // Primeiro tenta match exato
  const direct = stands.find((s) => s.slug === slug);
  if (direct) return direct;
  // Fallback: normaliza para ASCII e compara (tolerante a acentos)
  const norm = normalizeSlug(slug);
  return stands.find((s) => normalizeSlug(s.slug) === norm) || null;
}

function normalizeSlug(s) {
  try {
    return String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  } catch {
    return String(s).toLowerCase();
  }
}
