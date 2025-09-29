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

  const [isLoading, setIsLoading] = useState(false); // Para o loading da chamada da API de criar link.
  const [isInitializing, setIsInitializing] = useState(true); // Para o loading inicial (verificação de auth e busca de dados).
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null); // Para guardar os dados do usuário (email, id).
  const [negocioData, setNegocioData] = useState(null); // Para guardar os dados do negócio (nome, etc.).

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

        // 2. Busco dados do negócio (opcional, mas bom para mostrar o nome na página).
        const { data: negocio, error: negocioError } = await supabase
          .from('negocios')
          .select('id, nome') // Só preciso do ID e nome aqui.
          .eq('id', negocioId)
          .single(); // Espero um único resultado.

        if (!isMounted) return;
        if (negocioError) throw negocioError; // Se der erro, jogo para o catch.
        if (!negocio) throw new Error("Negócio não encontrado com o ID fornecido."); // Se não achar o negócio.
        if (isMounted) setNegocioData(negocio);

      } catch (catchError) {
        console.error("Erro ao verificar sessão ou buscar dados do negócio:", catchError);
        if (isMounted) setError("Ocorreu um erro inesperado ao carregar os dados da página. Tente novamente mais tarde.");
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
    <div className="container mx-auto max-w-4xl p-4 md:p-8 my-10">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">Escolha seu Plano de Assinatura</h1>
        <p className="text-center text-gray-600 mb-10">
          Mantenha seu negócio visível! Selecione o plano ideal para {negocioData?.nome ? `"${negocioData.nome}"` : 'seu estabelecimento'}.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card do Plano Mensal */}
            <div className="border p-6 rounded-lg shadow-lg flex flex-col bg-white">
                <h2 className="text-2xl font-semibold text-center mb-4 text-green-700">Plano Mensal</h2>
                <p className="text-4xl font-bold text-center mb-2">R$ 59,90<span className="text-lg font-normal text-gray-500">/mês</span></p>
                <ul className="text-gray-600 space-y-2 my-6 text-left flex-grow">
                    <li>✅ Visibilidade completa no portal</li>
                    <li>✅ Gerenciamento de informações e fotos</li>
                    <li>✅ Suporte prioritário via WhatsApp</li>
                    {/* Lembrete: Adicionar mais benefícios aqui se necessário. */}
                </ul>
                <button
                    onClick={() => handleAssinarClick('monthly')} // Chamo com 'monthly'.
                    disabled={isLoading} // Desabilito se estiver carregando.
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-wait"
                >
                    {isLoading ? 'Aguarde...' : 'Assinar Plano Mensal'}
                </button>
            </div>

            {/* Card do Plano Anual */}
            <div className="border p-6 rounded-lg shadow-lg flex flex-col bg-white relative ring-2 ring-yellow-400">
              <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full uppercase">Mais Popular</span>
                <h2 className="text-2xl font-semibold text-center mb-4 text-yellow-700">Plano Anual</h2>
                <p className="text-4xl font-bold text-center mb-2">R$ 699,90<span className="text-lg font-normal text-gray-500">/ano</span></p>
                <p className="text-center text-sm text-green-600 font-medium mb-4">(Economize aproximadamente R$ 200,00)</p>
                <ul className="text-gray-600 space-y-2 my-6 text-left flex-grow">
                    <li>✅ Todos os benefícios do Plano Mensal</li>
                    <li>✅ Maior economia a longo prazo</li>
                    <li>✅ Destaque nos resultados de busca (Exemplo de benefício futuro)</li>
                    {/* Lembrete: Adicionar mais benefícios aqui se necessário. */}
                </ul>
                <button
                    onClick={() => handleAssinarClick('yearly')} // Chamo com 'yearly'.
                    disabled={isLoading} // Desabilito se estiver carregando.
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-wait"
                >
                    {isLoading ? 'Aguarde...' : 'Assinar Plano Anual'}
                </button>
            </div>
        </div>
         {/* Feedback visual enquanto o link de pagamento está sendo gerado. */}
        {isLoading && (
              <div className="text-center mt-6 text-blue-600 flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Gerando link de pagamento seguro... Por favor, aguarde.</span>
              </div>
            )}
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
