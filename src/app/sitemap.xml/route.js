import { supabase } from '@/app/lib/supabaseClient';

export async function GET() {
  // Corrigido: buscar id e slug
  const { data: categorias } = await supabase.from('categorias').select('id, slug');
  const { data: negocios } = await supabase.from('negocios').select('cidade, categoria_id');

  const categoriaMap = {};
  (categorias || []).forEach(cat => { categoriaMap[cat.id] = cat.slug; });

  const urls = new Set();
  (negocios || []).forEach(n => {
    const slug = categoriaMap[n.categoria_id];
    if (slug && n.cidade) {
      const cidadeUrl = n.cidade
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').toLowerCase();
      urls.add(`https://vempracaapp.com/${slug}/${cidadeUrl}`);
    }
  });

  urls.add('https://vempracaapp.com/');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls].map(url => `<url><loc>${url}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}