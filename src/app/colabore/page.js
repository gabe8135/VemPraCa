// src/app/colabore/page.js

export default function ColaborePage() {
  return (
    <section className="w-full py-16 px-4 flex flex-col items-center justify-center bg-white mt-16">
      <div className="max-w-2xl w-full text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-emerald-700 mb-4">
          Seja um Colaborador!
        </h2>
        <p className="text-lg text-gray-700 mb-6">
          Ajude a manter e evoluir a plataforma{" "}
          <span className="font-semibold text-emerald-700">VemPraCa</span>!
          <br />
          Sua contribuição financeira é fundamental para que possamos continuar
          desenvolvendo novas funcionalidades, manter o projeto no ar e apoiar
          negócios locais.
        </p>
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-emerald-100 flex flex-col items-center">
          <h3 className="text-xl font-semibold text-emerald-700 mb-2">
            Contribua via Pix
          </h3>
          <p className="text-gray-700 mb-2">Chave Pix (celular):</p>
          <div className="font-mono text-lg text-emerald-800 bg-emerald-50 rounded-full px-3 py-2 mb-2 select-all">
            (13)997399924
          </div>
          <p className="text-gray-500 text-sm mb-2">Nome: Gabriel Ramos</p>
          <img
            src="/pay/pay.webp"
            alt="QR Code Pix"
            className="w-40 h-40 mx-auto mb-2"
          />
          <p className="text-xs text-gray-400">
            Escaneie o QR Code ou copie a chave acima para apoiar!
          </p>
        </div>
        <p className="text-gray-600 text-sm">
          Toda ajuda é bem-vinda. Obrigado por acreditar no projeto! 💚
        </p>
      </div>
    </section>
  );
}
