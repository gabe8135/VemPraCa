import React from 'react';
import BrandLoader from '@/app/components/BrandLoader';

function LoadingModal({ isOpen, message }) {
  if (!isOpen) return null;

  const statusMessage = message || 'Processando...';

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-md backdrop-saturate-150 flex justify-center items-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-modal-message"
    >
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center flex flex-col items-center">
        <BrandLoader size="sm" showMessage={false} className="py-0" message={statusMessage} />
        <p id="loading-modal-message" className="text-gray-800 font-semibold mt-3">{statusMessage}</p>
      </div>
    </div>
  );
}

export default LoadingModal;