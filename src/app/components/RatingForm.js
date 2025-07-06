'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MdOutlineStar, MdOutlineStarBorder } from 'react-icons/md'; // Ícones de estrela
import { FaPaperPlane, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa'; // Ícones para feedback

// Labels para o feedback de estrelas
const starLabels = ['Ruim', 'Razoável', 'Bom', 'Muito Bom', 'Excelente'];

export default function RatingForm({ negocioId, currentUser, onRatingSuccess }) {
const router = useRouter();
const [rating, setRating] = useState(0);
const [hoverRating, setHoverRating] = useState(0);
const [comment, setComment] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
const [existingRating, setExistingRating] = useState(null);

  // Busca a avaliação existente do usuário ao carregar
useEffect(() => {
    const fetchExistingRating = async () => {
    if (!currentUser) return;

    const { data, error } = await supabase
        .from('avaliacoes_negocios')
        .select('*')
        .eq('negocio_id', negocioId)
        .eq('usuario_id', currentUser.id)
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar avaliação existente:', error);
    } else if (data) {
        setExistingRating(data);
        setRating(data.nota);
        setComment(data.comentario || '');
    }
    };

    fetchExistingRating();
}, [currentUser, negocioId]);

const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
    router.push('/login?message=Você precisa estar logado para avaliar.');
    return;
    }

    if (rating === 0) {
    setStatusMessage({ text: 'Por favor, selecione de 1 a 5 estrelas.', type: 'error' });
    return;
    }

    setIsSubmitting(true);
    setStatusMessage({ text: 'Enviando sua avaliação...', type: 'loading' });

    const ratingData = {
    negocio_id: negocioId,
    usuario_id: currentUser.id,
    nota: rating,
    comentario: comment,
    data_avaliacao: new Date().toISOString(),
    };

    try {
    let error;
    if (existingRating) {
        // Atualiza a avaliação existente
        const { error: updateError } = await supabase.from('avaliacoes_negocios').update(ratingData).eq('id', existingRating.id);
        error = updateError;
    } else {
        // Insere uma nova avaliação
        const { error: insertError } = await supabase.from('avaliacoes_negocios').insert(ratingData);
        error = insertError;
    }

    if (error) throw error;

    setStatusMessage({ text: 'Obrigado pela sua avaliação!', type: 'success' });
    setIsSubmitting(false);
    if (onRatingSuccess) {
        onRatingSuccess(); // Chama a função para recarregar os dados na página pai
    }
    } catch (error) {
    console.error('Erro ao enviar avaliação:', error);
    setStatusMessage({ text: 'Ocorreu um erro. Tente novamente.', type: 'error' });
    setIsSubmitting(false);
    }
};

  // Determina qual label mostrar com base na seleção ou hover
const currentRatingForLabel = hoverRating || rating;
const currentLabel = currentRatingForLabel > 0 ? starLabels[currentRatingForLabel - 1] : '';

return (
    <div className="mt-6 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
    <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">
        {existingRating ? 'Edite sua Avaliação' : 'Deixe sua Avaliação'}
    </h3>

    {!currentUser && (
        <div className="text-center bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <p className="text-sm text-yellow-800">
            Você precisa estar <Link href="/login" className="font-bold hover:underline">logado</Link> para avaliar.
        </p>
        </div>
    )}

    {currentUser && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seção de Estrelas */}
        <div className="text-center">
            <div className="flex items-center justify-center text-3xl text-yellow-400 space-x-1">
            {[...Array(5)].map((_, index) => {
                const starValue = index + 1;
                return (
                <button
                    type="button"
                    key={starValue}
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="cursor-pointer transition-transform transform hover:scale-125 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSubmitting}
                >
                    {(hoverRating || rating) >= starValue ? <MdOutlineStar /> : <MdOutlineStarBorder />}
                </button>
                );
            })}
            </div>
            <p className="text-xs text-gray-500 mt-1 h-4 transition-opacity">
            {currentLabel}
            </p>
        </div>

          {/* Seção de Comentário */}
        <div>
            <label htmlFor="comment" className="block text-sm font-medium text-green-700">Seu comentário (opcional):</label>
            <textarea id="comment" name="comment" rows="4" value={comment} onChange={(e) => setComment(e.target.value)} disabled={isSubmitting} className="mt-1 block w-full rounded-md p-2 border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm text-black disabled:bg-gray-100" placeholder="Conte como foi sua experiência..."></textarea>
        </div>

          {/* Seção de Submissão */}
        <div className="flex flex-col items-center gap-4">
            <button type="submit" disabled={isSubmitting || rating === 0} className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
            {isSubmitting ? 'Enviando...' : (existingRating ? 'Atualizar Avaliação' : 'Enviar Avaliação')}
            </button>
            {statusMessage.text && (
            <div className={`flex items-center gap-2 text-sm ${ statusMessage.type === 'success' ? 'text-green-600' : statusMessage.type === 'error' ? 'text-red-600' : 'text-gray-600' }`}>
                {statusMessage.type === 'success' && <FaCheckCircle />}
                {statusMessage.type === 'error' && <FaTimesCircle />}
                <p>{statusMessage.text}</p>
            </div>
            )}
        </div>
        </form>
    )}
    </div>
);
}