import { supabase } from '@/app/lib/supabaseClient';

// Função para normalizar string (remove acentos, minúsculo, troca hífen por espaço)
function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/-/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateMetadata({ params }) {
  const paramsData = await params;
  const { categoria, cidade } = paramsData;

  // Buscar nome da categoria no banco para exibir corretamente no título
  const { data: categoriaData } = await supabase
    .from('categorias')
    .select('nome')
    .eq('slug', categoria)
    .maybeSingle();

  const categoriaNome = categoriaData?.nome || categoria;
  const cidadeNome = cidade.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const title = `Melhores ${categoriaNome} em ${cidadeNome} | VemPraCa`;
  const description = `Veja os melhores ${categoriaNome} em ${cidadeNome} cadastrados no VemPraCa. Encontre hotéis, pousadas, restaurantes e mais!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://vempracaapp.com/${categoria}/${cidade}`,
      siteName: 'VemPraCa',
      type: 'website',
      locale: 'pt_BR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function CategoriaCidadePage({ params }) {
  const paramsData = await params;
  const { categoria, cidade } = paramsData;

  // 1. Buscar o ID da categoria pelo slug
  const { data: categoriaData, error: categoriaError } = await supabase
    .from('categorias')
    .select('id, nome, slug, aliases')
    .or(`slug.eq.${categoria},aliases.cs.{${categoria}}`)
    .maybeSingle();

  if (categoriaError) {
    return <div className="p-6 text-red-600 bg-red-100 rounded-md text-center">Erro ao buscar categoria.</div>;
  }
  if (!categoriaData) {
    return <div className="p-6 text-red-600 bg-red-100 rounded-md text-center">Categoria não encontrada.</div>;
  }

  // 2. Buscar todos os negócios da categoria (sem filtrar cidade ainda)
  const { data: negociosAll } = await supabase
    .from('negocios')
    .select('id, nome, descricao, imagens, cidade')
    .eq('categoria_id', categoriaData.id);

  // 3. Filtrar no JS usando a função normalize (agora usando includes)
  const cidadeParam = normalize(cidade);
  const negocios = (negociosAll || []).filter(n =>
    normalize(n.cidade).includes(cidadeParam)
  );

  // 1. Buscar todas as cidades dessa categoria (sem filtro)
  const cidadesUnicas = Array.from(
    new Set((negociosAll || []).map(n => normalize(n.cidade)))
  )
    .filter(c => c && c !== normalize(cidade));

  console.log('Cidades encontradas:', (negociosAll || []).map(n => n.cidade));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 capitalize">
        {categoriaData.nome} em {cidade.replace('-', ' ')}
      </h1>
      {cidadesUnicas.length > 0 && (
        <div className="mb-4 text-sm text-gray-700">
          Outras cidades desta categoria:&nbsp;
          {cidadesUnicas.map((c, i) => (
            <a
              key={c}
              href={`/${categoria}/${c.replace(/ /g, '-').toLowerCase()}`}
              className="text-green-700 hover:underline mr-2"
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </a>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {negocios && negocios.length > 0 ? (
          negocios.map(n => {
            // Se imagens for array, pega a primeira. Se for string, usa direto.
            let imgUrl = '';
            if (Array.isArray(n.imagens)) {
              imgUrl = n.imagens[0];
            } else if (typeof n.imagens === 'string') {
              try {
                const arr = JSON.parse(n.imagens);
                imgUrl = Array.isArray(arr) ? arr[0] : '';
              } catch {
                imgUrl = n.imagens;
              }
            }
            return (
              <li key={n.id} className="bg-white rounded shadow p-4 flex flex-col">
                {imgUrl && (
                  <img
                    src={imgUrl}
                    alt={n.nome}
                    className="w-full h-40 object-cover rounded mb-2"
                    loading="lazy"
                  />
                )}
                <h2 className="text-lg font-bold mb-1">{n.nome}</h2>
                <p className="text-sm text-gray-600 mb-2">{n.descricao?.slice(0, 100)}...</p>
                <a
                  href={`/negocio/${n.id}`}
                  className="mt-auto inline-block text-green-700 font-semibold hover:underline"
                >
                  Ver detalhes
                </a>
              </li>
            );
          })
        ) : (
          <li>Nenhum resultado encontrado.</li>
        )}
      </ul>
    </div>
  );
}