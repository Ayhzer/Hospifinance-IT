/**
 * Utilitaires d'authentification - SHA-256 via Web Crypto API
 */

/**
 * Hash un mot de passe avec SHA-256
 * @param {string} password
 * @returns {Promise<string>} Hash hexadécimal
 */
export const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Vérifie un mot de passe contre un hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export const verifyPassword = async (password, hash) => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};
