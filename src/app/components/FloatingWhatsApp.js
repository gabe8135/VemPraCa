"use client";

import { useState } from "react";

const options = [
  {
    label: "Falar sobre cadastro",
    message:
      "Olá! Tudo bem? Gostaria de saber como posso cadastrar meu negócio na plataforma. Pode me ajudar, por favor?",
  },
  {
    label: "Dúvidas sobre planos",
    message:
      "Oi! Espero que esteja bem. Tenho interesse em anunciar e gostaria de entender melhor os planos disponíveis. Pode me explicar, por gentileza?",
  },
  {
    label: "Suporte técnico",
    message:
      "Olá! Preciso de uma ajudinha com a plataforma. Você pode me orientar, por favor? Muito obrigado!",
  },
  {
    label: "Quero saber como funciona a plataforma",
    message:
      "Olá! Gostaria de entender melhor como funciona a plataforma VemPraCá. Pode me explicar?",
  },
  {
    label: "Preciso de ajuda para encontrar um serviço",
    message:
      "Olá! Estou procurando um serviço específico e gostaria de uma ajudinha para encontrar. Pode me orientar?",
  },
  {
    label: "Quero anunciar um evento ou vaga",
    message:
      "Oi! Gostaria de anunciar um evento ou uma vaga de emprego na plataforma. Como faço?",
  },
  {
    label: "Sugestão ou feedback",
    message:
      "Olá! Tenho uma sugestão/feedback sobre a plataforma e gostaria de compartilhar. Posso enviar por aqui?",
  },
];

export default function FloatingWhatsApp({ phoneNumber }) {
  const [isHovered, setIsHovered] = useState(false);
  const [open, setOpen] = useState(false);

  const handleWhatsAppClick = () => {
    setOpen((v) => !v);
  };

  const handleOptionClick = (msg) => {
    const formattedPhone = phoneNumber.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(msg);
    const whatsappUrl = `https://wa.me/55${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
    setOpen(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
      }}
    >
      <button
        onClick={handleWhatsAppClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="floating-wa-btn"
        aria-label="Fale conosco no WhatsApp"
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.63" />
        </svg>
        <span className="sr-only">WhatsApp</span>
      </button>

      {/* Pulse effect */}
      <span className="wa-pulse" />

      {/* Mini-menu de opções */}
      {open && (
        <div className="wa-menu">
          <div className="wa-menu-title">Como podemos ajudar?</div>
          {options.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => handleOptionClick(opt.message)}
              className="wa-menu-btn"
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .floating-wa-btn {
          background-color: #25d366;
          color: white;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(37, 211, 102, 0.3);
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.3s ease;
          z-index: 1;
          animation: wa-pulse 1.6s infinite;
        }
        .wa-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 60px;
          height: 60px;
          background: #25d366;
          opacity: 0.18;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          z-index: 0;
          animation: wa-pulse-outer 1.6s infinite;
        }
        @keyframes wa-pulse {
          0%,
          100% {
            box-shadow: 0 8px 25px rgba(37, 211, 102, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(37, 211, 102, 0.12);
          }
        }
        @keyframes wa-pulse-outer {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.18;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.18);
            opacity: 0.1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.18;
          }
        }
        @media (max-width: 640px) {
          .floating-wa-btn {
            width: 40px;
            height: 40px;
          }
          .wa-pulse {
            width: 48px;
            height: 48px;
          }
        }
        .wa-menu {
          position: absolute;
          bottom: 60px;
          right: 0;
          background: #fff;
          color: #1f2937;
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
          min-width: 220px;
          padding: 14px 0 8px 0;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.2s;
        }
        .wa-menu-title {
          font-size: 15px;
          font-weight: 600;
          padding: 0 20px 10px 20px;
          color: #059669;
        }
        .wa-menu-btn {
          background: none;
          border: none;
          text-align: left;
          width: 100%;
          padding: 10px 20px;
          font-size: 15px;
          color: #1f2937;
          cursor: pointer;
          border-radius: 6px;
          margin-bottom: 2px;
          font-weight: 500;
          transition: background 0.18s;
        }
        .wa-menu-btn:hover {
          background: #f0fdf4;
          color: #059669;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
