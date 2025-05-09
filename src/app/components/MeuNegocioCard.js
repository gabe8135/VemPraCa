// src/app/components/MeuNegocioCard.js
'use client';

import Link from 'next/link';

// Este card recebe os dados do meu negócio e a função para deletá-lo.
export default function MeuNegocioCard({ meuNegocio, onDelete }) {
  // Se não tiver dados do negócio, não mostro nada.
  if (!meuNegocio) return null;

  // Defino uma imagem padrão caso não haja uma no `meuNegocio.imagens`.
  const imageUrl = (meuNegocio.imagens && meuNegocio.imagens.length > 0)
    ? meuNegocio.imagens[0]
    : "https://via.placeholder.com/300?text=Sem+Imagem";

  const handleDeleteClick = (e) => {
    e.preventDefault(); // Evito que o clique no botão de deletar cause navegação.
    e.stopPropagation(); // Paro a propagação do clique para não afetar outros elementos.
    // Chamo a função `onDelete` que veio do componente pai, passando o ID do meu negócio.
    if (onDelete) {
      onDelete(meuNegocio.id);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Meu Negócio</h1>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <img
          src={imageUrl}
          alt={meuNegocio.nome || 'Imagem do estabelecimento'}
          className="w-full h-64 object-cover" // Deixo a imagem com uma altura maior para dar destaque no card.
          onError={(e) => { e.target.onerror = null; e.target.src='https://via.placeholder.com/300?text=Erro+Imagem'; }}
        />
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{meuNegocio.nome}</h2>
          {/* Lembrete: Para mostrar o nome da categoria aqui, eu precisaria buscar pelo ID ou ajustar a query na página pai. */}
          {/* <p className="text-sm text-green-700 font-semibold mb-2">{meuNegocio.nome_categoria || 'Categoria'}</p> */}
          <p className="text-gray-600 text-sm mb-2">{meuNegocio.cidade || 'Cidade não informada'}</p>
          <p className="text-gray-700 mb-4">{meuNegocio.descricao || "Sem descrição."}</p>
          <p className="text-gray-700 mb-4 text-sm"><strong>Endereço:</strong> {meuNegocio.endereco || "Não informado"}</p>

          {/* Mostro o status (ativo/inativo) do meu negócio. */}
          <p className={`text-sm font-semibold mb-6 ${meuNegocio.ativo ? 'text-green-600' : 'text-yellow-600'}`}>
            Status: {meuNegocio.ativo ? 'Ativo e Visível' : 'Inativo (Aguardando Aprovação/Pagamento)'}
          </p>

          {/* Meus botões de ação: Editar e Excluir. */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/meu-negocio/editar`} // Link para a página onde vou poder editar as informações do meu negócio.
              className="flex-1 text-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300"
            >
              Editar Informações
            </Link>
            <button
              onClick={handleDeleteClick}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-300"
            >
              Excluir Negócio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
