/**
 * Modale de changement de mot de passe
 */

import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AlertBanner } from '../common/AlertBanner';
import { useAuth } from '../../contexts/AuthContext';

export const ChangePasswordModal = ({ isOpen, onClose, targetUser }) => {
  const { user, changePassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Détermine si c'est un changement de son propre mot de passe
  const isOwnPassword = !targetUser || targetUser.id === user?.id;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validate = () => {
    // Si c'est son propre mot de passe, le mot de passe actuel est obligatoire
    if (isOwnPassword && !formData.currentPassword.trim()) {
      setError('Le mot de passe actuel est requis');
      return false;
    }

    if (!formData.newPassword.trim()) {
      setError('Le nouveau mot de passe est requis');
      return false;
    }

    if (formData.newPassword.length < 4) {
      setError('Le nouveau mot de passe doit contenir au moins 4 caractères');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    if (isOwnPassword && formData.currentPassword === formData.newPassword) {
      setError('Le nouveau mot de passe doit être différent de l\'ancien');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      // Changer le mot de passe (la vérification du mot de passe actuel est faite dans changePassword)
      const targetUserId = targetUser ? targetUser.id : user.id;
      const currentPwd = isOwnPassword ? formData.currentPassword : null;
      const result = await changePassword(targetUserId, formData.newPassword, currentPwd);

      if (result.success) {
        setSuccess(true);
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Fermer la modale après 2 secondes
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Une erreur est survenue');
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue');
      console.error('Erreur changement mot de passe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setError(null);
    setSuccess(false);
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isOwnPassword
          ? 'Changer mon mot de passe'
          : `Changer le mot de passe de ${targetUser?.username || ''}`
      }
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
            icon={<Lock size={16} />}
          >
            {loading ? 'Modification en cours...' : 'Modifier le mot de passe'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mot de passe actuel (seulement pour son propre mot de passe) */}
        {isOwnPassword && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe actuel *
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                placeholder="Entrez votre mot de passe actuel"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        )}

        {/* Nouveau mot de passe */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nouveau mot de passe *
          </label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
              placeholder="Entrez le nouveau mot de passe"
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Confirmation du mot de passe */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirmer le mot de passe *
          </label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
              placeholder="Confirmez le nouveau mot de passe"
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Messages de succès/erreur */}
        {error && (
          <AlertBanner type="error" onClose={() => setError(null)}>
            {error}
          </AlertBanner>
        )}

        {success && (
          <AlertBanner type="success">
            <div>
              <p className="font-semibold">Mot de passe modifié avec succès !</p>
              <p className="text-sm mt-1">La fenêtre va se fermer automatiquement...</p>
            </div>
          </AlertBanner>
        )}

        {/* Note de sécurité */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>Recommandations :</strong>
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>Utilisez au moins 8 caractères</li>
            <li>Mélangez majuscules, minuscules, chiffres et symboles</li>
            <li>Évitez les mots de passe trop simples (ex: admin, 123456)</li>
          </ul>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
