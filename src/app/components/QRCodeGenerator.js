import React from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QRCodeGenerator({ url, size = 180 }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <QRCodeCanvas value={url} size={size} />
      <span className="text-xs text-gray-600 break-all">{url}</span>
    </div>
  );
}

// Para direcionar o QR Code para a seção de avaliação, basta adicionar a âncora na URL:
// Exemplo de uso:
// <QRCodeGenerator url={`https://seusite.com/negocio/${negocio.id}#avaliacao`} />
// Isso fará o QR Code levar o usuário direto para a seção de avaliação ao acessar a página.
