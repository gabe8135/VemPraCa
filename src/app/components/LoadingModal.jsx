import React from 'react';

function LoadingModal({ isOpen, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md backdrop-saturate-150 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center flex flex-col items-center">
        {/* Ícone de spinner */}
        <svg className="animate-spin h-8 w-8 text-green-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {/* Mensagem de status */}
        <p className="text-gray-800 font-semibold">{message || 'Processando...'}</p>
      </div>
    </div>
  );
}

export default LoadingModal;