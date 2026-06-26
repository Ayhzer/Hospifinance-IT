/**
 * Bouton pour ouvrir la modale de changement de mot de passe
 */

import { useState } from 'react';
import { Key } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

export const ChangePasswordButton = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${className}`}
        title="Changer mon mot de passe"
      >
        <Key size={16} />
        <span className="hidden sm:inline">Mot de passe</span>
      </button>

      <ChangePasswordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default ChangePasswordButton;
