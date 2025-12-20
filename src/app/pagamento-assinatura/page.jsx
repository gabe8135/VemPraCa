// src/app/pagamento-assinatura/page.jsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabaseClient'; // Meu cliente Supabase já configurado.

// --- Meu Componente Interno com toda a lógica da página ---
function PagamentoAssinaturaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const negocioId = searchParams.get('negocioId'); // Pego o ID do negócio da URL.
  const canceled = searchParams.get('canceled') === '1';
  const isSuccess = searchParams.get('success') === '1' || searchParams.get('subscription') === 'success';

  const [isLoading, setIsLoading] = useState(false); // Para o loading da chamada da API de criar link.
  const [isInitializing, setIsInitializing] = useState(true); // Para o loading inicial (verificação de auth e busca de dados).
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null); // Para guardar os dados do usuário (email, id).
  const [negocioData, setNegocioData] = useState(null); // Para guardar os dados do negócio (nome, etc.).
  const [debugInfo, setDebugInfo] = useState(null); // Para debug: mostrar resultado bruto da consulta (remoção na UI abaixo).

  // --- Efeito para verificar autenticação e buscar dados iniciais ---
  useEffect(() => {
    let isMounted = true; // Flag para evitar setar estado se o componente desmontar.

    const checkAuthAndFetchData = async () => {
      if (!isMounted) return;
      setIsInitializing(true);
      setError('');
      setUserData(null);
      setNegocioData(null);

      if (!negocioId) {
        if (isMounted) setError("ID do negócio não encontrado na URL. Verifique o link.");
        if (isMounted) setIsInitializing(false);
        return;
      }

      try {
        // 1. Verifico se o usuário está logado.
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (userError || !user) {
          console.error("Usuário não autenticado ou erro ao buscar usuário:", userError);
          // Se não estiver logado, mando para o login, guardando a intenção de voltar para cá.
          router.push(`/login?redirect=/pagamento-assinatura?negocioId=${negocioId}&message=Faça login para gerenciar sua assinatura.`);
          return;
        }
        console.log('Usuário autenticado:', user.email);
        if (isMounted) setUserData({ email: user.email, id: user.id });


        // 2. Busco dados do negócio (e verifico permissão)
        const { data: negocio, error: negocioError, status, count } = await supabase
          .from('negocios')
          .select('id, nome, usuario_id, proprietario, email_proprietario', { count: 'exact', head: false })
          .eq('id', negocioId)
          .single();

        if (!isMounted) return;
        setDebugInfo({
          user,
          negocio,
          negocioError,
          status,
          count
        });
        if (negocioError) {
          console.error('Erro ao buscar negócio:', negocioError, 'Status:', status);
          throw negocioError;
        }
        if (!negocio) {
          setError("Negócio não encontrado. Verifique se o ID está correto ou se você tem permissão para acessar este negócio.");
          setIsInitializing(false);
          return;
        }

        // Verifica se o usuário é proprietário (ajuste conforme sua regra de permissão)
        const isOwner = negocio.usuario_id === user.id || negocio.proprietario === user.id || negocio.email_proprietario === user.email;
        if (!isOwner) {
          setError("Você não tem permissão para gerenciar este negócio. Faça login com a conta proprietária.");
          setIsInitializing(false);
          return;
        }

        if (isMounted) setNegocioData(negocio);

      } catch (catchError) {
        console.error("Erro ao verificar sessão ou buscar dados do negócio:", catchError);
        if (isMounted) setError(catchError.message || "Ocorreu um erro inesperado ao carregar os dados da página. Tente novamente mais tarde.");
      } finally {
        if (isMounted) setIsInitializing(false); // Finalizo o loading inicial.
      }
    };

    checkAuthAndFetchData();

    return () => { isMounted = false; }; // Limpeza do efeito.
  }, [router, negocioId]); // Dependências: router e negocioId.

  // --- Minha função para lidar com o clique no botão de assinar um plano ---
  const handleAssinarClick = async (tipoPlano) => {
    setIsLoading(true); // Ativo o loading do botão.
    setError('');

    if (!negocioId) {
        setError("Erro crítico: ID do negócio não está definido.");
        setIsLoading(false);
        return;
    }

    try {
      console.log(`Tentando obter link de assinatura para o plano: ${tipoPlano}`);

      // Preciso pegar o token JWT da sessão atual do Supabase aqui no cliente.
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        // Se não conseguir a sessão ou o token, mostro um erro e paro.
        throw new Error(sessionError?.message || 'Não foi possível obter sua sessão atual. Por favor, faça login novamente.');
      }
      const accessToken = sessionData.session.access_token;
      console.log("Frontend: Access Token obtido para enviar no header da API.");

  // Chamo minha API backend que vai criar o link de assinatura no provedor de pagamento.
    const response = await fetch('/api/stripe/checkout', { // Cria sessão de checkout Stripe.
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}` // Envio o token JWT no header para autenticar na API.
          },
          body: JSON.stringify({
              negocioId: negocioId, // ID do negócio para associar a assinatura.
              planType: tipoPlano    // Tipo do plano ('monthly' ou 'yearly').
          }),
      });

      const data = await response.json(); // Pego a resposta da API.

    // Verifico se a resposta da API foi OK e se veio a URL de checkout.
    if (!response.ok || !data.url) {
          // Se não, jogo um erro com a mensagem da API ou uma mensagem padrão.
          throw new Error(data.error || `Falha ao gerar o link de pagamento (Status: ${response.status}). Tente novamente.`);
      }

    console.log("Link de checkout recebido:", data.url);
    window.location.href = data.url; // Redireciono o usuário para a página de pagamento.

      // Lembrete: Se o redirecionamento para o MP funcionar, o código abaixo (setIsLoading(false)) não será executado,
      // pois a página atual será descarregada. Isso é o esperado.
      // setIsLoading(false);

    } catch (err) {
      console.error(`Erro ao tentar gerar link para o plano ${tipoPlano}:`, err);
      // Defino o erro no estado para que seja exibido na UI.
      setError(err.message || "Não foi possível iniciar o processo de assinatura. Verifique sua conexão e tente novamente.");
      setIsLoading(false); // Paro o loading do botão em caso de erro.
    }
  };

  // --- Minha Renderização ---
  if (isInitializing) { // Enquanto estiver carregando os dados iniciais.
    return (
      <div className="flex justify-center items-center h-screen flex-col gap-4">
        {/* Meu spinner de loading. */}
        <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p className="text-gray-600">Carregando opções de assinatura...</p>
      </div>
    );
  }

  // Se houver algum erro (de inicialização ou da API de assinatura).
  if (error) {
    return (
      <div className="container mx-auto max-w-lg p-8 my-10 text-center bg-white rounded-lg shadow-md">
        <h1 className="text-xl font-bold text-red-600 mb-4">Ops! Algo deu errado</h1>
        <p className="text-gray-700 mb-6">{error}</p> {/* Exibo a mensagem de erro que capturei. */}
        <Link href="/meu-negocio" className="text-blue-600 hover:underline">Voltar para Meu Negócio</Link>
      </div>
    );
  }

  // --- Renderização principal da página de escolha de planos ---
  return (
    <div className="relative"> 
      {/* Seção com fundo suave, inspirada no layout principal */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-gray-50 to-white" />
      <section className="container mx-auto max-w-3xl p-6 md:p-10 my-10 bg-white/90 backdrop-blur rounded-2xl shadow-lg ring-1 ring-gray-100">
        <div className="flex flex-col items-center">
      {/* Cabeçalho minimalista com ícone de segurança */}
      <div className="flex items-center gap-2 mb-3">
        <svg aria-hidden="true" className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 116 0v3H9z"></path></svg>
        <span className="text-sm text-gray-600">Pagamento seguro com Stripe Checkout</span>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-center mb-2 text-gray-800">Escolha seu plano</h1>
      <p className="text-center text-gray-600 mb-4">
        Ative <b>{negocioData?.nome || 'seu negócio'}</b> escolhendo um plano abaixo. Você será redirecionado ao ambiente de pagamento seguro da Stripe.
      </p>

      {/* Avisos de status */}
      {isSuccess && (
        <div className="w-full mb-4 rounded-md border border-green-300 bg-green-50 text-green-900 p-3 text-sm flex items-start gap-2">
          <svg aria-hidden="true" className="h-5 w-5 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4 1.5 1.5L11 16l-3.5-3.5L9 12z"></path></svg>
          <div>
            <p className="font-medium">Pagamento confirmado!</p>
            <p>Seu negócio será ativado automaticamente. Você pode acompanhar em Meus Negócios.</p>
          </div>
        </div>
      )}
      {canceled && (
        <div className="w-full mb-4 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-900 p-3 text-sm">
          Pagamento cancelado. Nenhuma cobrança foi realizada.
        </div>
      )}

      <div className="w-full flex flex-col gap-6">
        <div className="border p-5 rounded-lg shadow-sm flex flex-col bg-white">
          <h2 className="text-xl font-semibold text-green-700 text-center mb-1">Mensal</h2>
          <p className="text-3xl font-bold text-center mb-1">R$ 25 <span className="text-base font-normal text-gray-500">/mês</span></p>
          <ul className="text-gray-600 text-sm space-y-1 mt-2 mb-3">
            <li>• Visibilidade completa no portal</li>
            <li>• Gerenciamento de informações e fotos</li>
            <li>• Suporte prioritário</li>
          </ul>
          <button
            onClick={() => handleAssinarClick('monthly')}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-wait"
            aria-label="Assinar plano mensal"
          >
            {isLoading ? 'Aguarde...' : 'Assinar Mensal'}
          </button>
        </div>

        <div className="border p-5 rounded-lg shadow-sm flex flex-col bg-white ring-2 ring-yellow-400 relative">
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full uppercase">Mais Popular</span>
          <h2 className="text-xl font-semibold text-yellow-700 text-center mb-1">Anual</h2>
          <p className="text-3xl font-bold text-center mb-1">R$ 290 <span className="text-base font-normal text-gray-500">/ano</span></p>
          <ul className="text-gray-600 text-sm space-y-1 mt-2 mb-3">
            <li>• Todos os benefícios do Mensal</li>
            <li>• Economia no longo prazo</li>
            <li>• Preparado para futuros destaques</li>
          </ul>
          <button
            onClick={() => handleAssinarClick('yearly')}
            disabled={isLoading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-wait"
            aria-label="Assinar plano anual"
          >
            {isLoading ? 'Aguarde...' : 'Assinar Anual'}
          </button>
        </div>
      </div>

      {/* Rodapé informativo */}
      <div className="flex items-center gap-2 mt-8 text-xs text-gray-500">
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 116 0v3H9z"></path></svg>
        <span>Checkout seguro hospedado pela Stripe</span>
      </div>

      {isLoading && (
        <div className="text-center mt-6 text-blue-600 flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span>Redirecionando para o Stripe...</span>
        </div>
      )}
        </div>
      </section>
    </div>
  );
}

// --- Meu Componente Wrapper que usa Suspense para o useSearchParams ---
// Lembrete: Suspense é necessário porque useSearchParams só funciona em Client Components
// que são filhos de um <Suspense>.
export default function PagamentoAssinaturaPage() {
  return (
    <Suspense fallback={ // Meu fallback UI enquanto o Suspense carrega.
      <div className="flex justify-center items-center h-screen flex-col gap-4">
        <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p className="text-gray-600">Carregando página de assinatura...</p>
      </div>
    }>
      <PagamentoAssinaturaContent />
    </Suspense>
  );
}
