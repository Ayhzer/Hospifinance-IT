/**
 * Composant Modal réutilisable
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  // Gestion de l'échappement
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Empêcher le scroll du body quand la modale est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      onClick={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`bg-white rounded-t-2xl sm:rounded-lg shadow-xl ${sizeClasses[size]} w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto`}>
        <div className="p-4 sm:p-6">
          {/* En-tête */}
          <div className="flex justify-between items-start sm:items-center mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 pr-4 leading-tight">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 touch-manipulation p-1"
              aria-label="Fermer"
            >
              <X size={24} />
            </button>
          </div>

          {/* Contenu */}
          <div className="mb-4 sm:mb-6">{children}</div>

          {/* Footer */}
          {footer && <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
};
