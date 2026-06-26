/**
 * Gestionnaire d'erreurs global
 */

// eslint-disable-next-line no-unused-vars -- Express identifie un error handler par son arité (4 args)
export const errorHandler = (err, req, res, next) => {
  console.error('Erreur:', err);

  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Erreur de validation',
      details: err.errors
    });
  }

  // Erreur MongoDB duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Cette ressource existe déjà',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  // Erreur par défaut
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur interne'
  });
};
