/**
 * Composant Button réutilisable
 */


// Classes de base (structure) sans couleur pour les variantes qui utilisent CSS vars
const BUTTON_VARIANT_CLASSES = {
  primary: 'text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  success: 'text-white',
  danger: 'text-white',
  warning: 'text-white',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
};

// Styles inline pour les variantes utilisant les CSS variables de couleur
const BUTTON_VARIANT_STYLES = {
  primary: { backgroundColor: 'var(--color-primary)' },
  secondary: {},
  success: { backgroundColor: 'var(--color-success)' },
  danger: { backgroundColor: 'var(--color-danger)' },
  warning: { backgroundColor: 'var(--color-warning)' },
  outline: {}
};

const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) => {
  const variantClass = BUTTON_VARIANT_CLASSES[variant] || BUTTON_VARIANT_CLASSES.primary;
  const variantStyle = BUTTON_VARIANT_STYLES[variant] || {};
  const sizeClass = BUTTON_SIZES[size] || BUTTON_SIZES.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={variantStyle}
      className={`
        flex items-center gap-2 rounded-lg transition-colors
        ${variantClass} ${sizeClass}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
