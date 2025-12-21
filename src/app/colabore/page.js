// src/app/colabore/page.js

export default function ColaborePage() {
  return (
    <section className="w-full min-h-screen bg-gradient-to-tr from-emerald-50 to-green-100/60 flex flex-col items-center justify-center pt-28 pb-20 px-4">
      <div className="max-w-2xl w-full text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold text-emerald-800 mb-5 tracking-tight drop-shadow-sm font-[MyriadPro,Inter,sans-serif]">
          Seja um Colaborador!
        </h2>
        <p className="text-lg md:text-xl text-emerald-900 mb-8 font-medium">
          Ajude a manter e evoluir a plataforma{" "}
          <span className="font-bold text-emerald-700">VemPraCá</span>!<br />
          Sua contribuição financeira é fundamental para continuarmos
          desenvolvendo novas funcionalidades, manter o projeto no ar e apoiar
          negócios locais.
        </p>
        <div className="bg-white/90 rounded-3xl shadow-2xl p-8 md:p-10 mb-8 border border-emerald-100 flex flex-col items-center">
          <h3 className="text-2xl font-bold text-emerald-700 mb-3">
            Contribua via Pix
          </h3>
          <p className="text-gray-700 mb-2 text-base">Chave Pix (celular):</p>
          <div className="font-mono text-xl text-emerald-900 bg-emerald-50 rounded-full px-5 py-3 mb-3 select-all border border-emerald-200 shadow-inner">
            (13)997399924
          </div>
          <p className="text-gray-500 text-sm mb-3">Nome: Gabriel Ramos</p>
          <div className="flex flex-col items-center justify-center mb-2">
            <img
              src="/pay/pay.webp"
              alt="QR Code Pix"
              className="w-44 h-44 rounded-2xl shadow border border-emerald-100 mb-2"
            />
            <span className="text-xs text-gray-400">
              Escaneie o QR Code ou copie a chave acima para apoiar!
            </span>
          </div>
        </div>
        <p className="text-emerald-700 text-base font-semibold mt-2">
          Toda ajuda é bem-vinda.
          <br />
          Obrigado por acreditar no projeto!{" "}
          <span className="text-2xl align-middle">💚</span>
        </p>
      </div>
    </section>
  );
}
