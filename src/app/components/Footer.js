import Link from 'next/link'; // Preciso do Link do Next.js para navegação interna.

export default function Footer() {
    const anoCriacao = 2024;
    const anoAtual = new Date().getFullYear();

    return (
      <footer className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-4">
        <div className="container mx-auto text-center text-sm"> {/* Diminuí um pouco o texto aqui com text-sm. */}
          <p className="mb-1"> {/* Adicionei uma margem inferior para separar do link. */}
            &copy;{anoCriacao}{anoAtual > anoCriacao ? `-${anoAtual}` : ''} - VemPraCá↗. Todos os direitos reservados.
          </p>
          {/* Link para a página de Termos de Uso. */}
          <Link href="/termos-de-uso" className="hover:underline hover:text-gray-300 transition">
            Termos de Uso
          </Link>
        </div>
      </footer>
    );
  }