//hotel-portal\src\app\components\BusinessCard.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";

// Meu componente para mostrar e interagir com as estrelas de avaliação.
function Estrelas({ media = 0, onAvaliar, avaliacaoUsuario, jaAvaliou, setAvaliacaoUsuario, setJaAvaliou }) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) return null; // Evito problemas de hidratação.

    const estrelas = [];
    const notaParaExibir = jaAvaliou ? avaliacaoUsuario : media;

    for (let i = 1; i <= 5; i++) {
        const isPreenchida = i <= Math.round(notaParaExibir);
        estrelas.push(
            <button
                key={i}
                onClick={(e) => {
                    e.stopPropagation(); // Importante para não disparar o clique do card pai.
                    if (!jaAvaliou) { // Só deixo avaliar se ainda não o fez nesta sessão do card.
                        onAvaliar(i);
                        setAvaliacaoUsuario(i);
                        setJaAvaliou(true);
                    }
                }}
                className={`text-yellow-500 focus:outline-none ${jaAvaliou ? "cursor-default opacity-70" : "cursor-pointer hover:scale-125 transition-transform"}`} // Estilo diferente se já avaliou.
                disabled={jaAvaliou} // Desabilito o botão depois da avaliação.
                aria-label={`Avaliar ${i} estrela${i > 1 ? 's' : ''}`}
            >
                {isPreenchida ? '★' : '☆'}
            </button>
        );
    }

    return <div className="flex items-center space-x-1">{estrelas}</div>;
}

// Este é o card que mostra as informações de um negócio.
// Antes era HotelCard, agora é mais genérico e recebe `business`.
export default function BusinessCard({ business }) {
    const router = useRouter();
    const [avaliacaoUsuario, setAvaliacaoUsuario] = useState(0);
    const [jaAvaliou, setJaAvaliou] = useState(false); // Para controlar se o usuário já avaliou *nesta sessão específica do card*.

    // Minha função para quando o usuário clica para avaliar.
    const onAvaliar = async (nota) => {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                console.error("Usuário não autenticado:", userError);
                alert("Você precisa estar logado para avaliar.");
                setJaAvaliou(false); // Se não estiver logado, reseto para permitir tentar de novo após login.
                return;
            }

            console.log(`Tentando avaliar negócio ID: ${business.id} com nota: ${nota} pelo usuário: ${user.id}`);

            // Lembrete: Estou inserindo na tabela 'avaliacoes_negocios' e usando 'negocio_id'.
            const { data, error } = await supabase
                .from('avaliacoes_negocios') // Tabela correta.
                .insert([
                    {
                        negocio_id: business.id, // Coluna correta.
                        nota: nota,
                        usuario_id: user.id
                    }
                ])
                .select(); // O select aqui é opcional, mas pode ser útil para debug.

            // Preciso tratar o erro de violação de chave única (usuário já avaliou este negócio antes).
            if (error && error.code === '23505') { // 23505 é o código de erro para unique violation no PostgreSQL.
                 console.warn("Usuário já avaliou este estabelecimento anteriormente.");
                 alert("Você já avaliou este estabelecimento.");
                 setJaAvaliou(true); // Marco como já avaliado mesmo se a tentativa de inserir falhou por duplicidade.
            } else if (error) {
                console.error("Erro ao salvar avaliação:", error);
                alert("Ocorreu um erro ao salvar sua avaliação. Tente novamente.");
                setJaAvaliou(false); // Reseto se der outro tipo de erro.
            } else {
                console.log("Avaliação salva com sucesso:", data);
                // NOTA: A média exibida no card não atualiza na hora.
                // Isso exigiria um refetch dos dados do negócio ou uma lógica mais complexa aqui.
                // Por enquanto, a média só atualiza no próximo carregamento da página.
            }
        } catch (err) {
            console.error("Erro geral ao enviar avaliação:", err);
            alert("Ocorreu um erro inesperado. Tente novamente.");
            setJaAvaliou(false); // Reseto em caso de erro geral.
        }
    };

    // Quando o card é clicado, navego para a página de detalhes do negócio.
    const handleCardClick = () => {
        // Lembrete: A rota agora é genérica: '/negocio/[id]'.
        router.push(`/negocio/${business.id}`); // Rota correta.
    };

    // Defino uma imagem padrão se o negócio não tiver imagens.
    const imageUrl = (business.imagens && business.imagens.length > 0)
        ? business.imagens[0] // Uso a primeira imagem do array.
        : "https://via.placeholder.com/300?text=Sem+Imagem"; // Imagem placeholder.

    // Defino uma descrição padrão se não houver.
    const descriptionText = business.descricao || "Sem descrição disponível.";

    return (
        <div
            className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col h-full" // cursor-pointer para indicar que é clicável.
            onClick={handleCardClick} // Chamo a navegação ao clicar.
        >
            <img
                src={imageUrl}
                alt={business.nome || 'Imagem do estabelecimento'} // Alt text com o nome do negócio.
                className="w-full h-48 object-cover" // Altura fixa para os cards ficarem consistentes.
                onError={(e) => { e.target.onerror = null; e.target.src='https://via.placeholder.com/300?text=Erro+Imagem'; }} // Fallback se a imagem der erro ao carregar.
            />
            <div className="p-4 flex flex-col flex-grow"> {/* Padding e flex para o conteúdo esticar. */}
                <h2 className="text-xl font-bold text-gray-800 mb-1 truncate" title={business.nome}>{business.nome}</h2>
                <p className="text-sm text-green-700 font-semibold mb-1">{business.nome_categoria || 'Categoria não definida'}</p>
                <p className="text-gray-600 text-sm mb-2">{business.cidade || 'Cidade não informada'}</p>
                {/* Limito a descrição e coloco um tooltip para ver o texto completo. */}
                <p className="text-sm text-gray-500 mb-3 flex-grow" title={descriptionText}>
                    {descriptionText.length > 60 ? `${descriptionText.slice(0, 60)}...` : descriptionText}
                </p>

                {/* Minha seção de avaliação, fica na parte inferior do card. */}
                <div className="mt-auto pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                        <Estrelas
                            media={parseFloat(business.media_avaliacoes) || 0}
                            onAvaliar={onAvaliar}
                            avaliacaoUsuario={avaliacaoUsuario}
                            jaAvaliou={jaAvaliou}
                            setAvaliacaoUsuario={setAvaliacaoUsuario}
                            setJaAvaliou={setJaAvaliou}
                        />
                        <p className="text-xs text-gray-400">
                            {/* Mostro a média formatada e o total de avaliações. */}
                            ({business.media_avaliacoes ? parseFloat(business.media_avaliacoes).toFixed(1) : "N/A"})
                            {" "}{business.total_avaliacoes || 0} {business.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
