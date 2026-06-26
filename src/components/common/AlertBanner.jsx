/**
 * Composant AlertBanner pour afficher des alertes
 */

import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const ALERT_TYPES = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    textColor: 'text-green-800',
    iconColor: 'text-green-600'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
    iconColor: 'text-red-600'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600'
  }
};

export const AlertBanner = ({ type = 'info', message, children, className = '' }) => {
  const config = ALERT_TYPES[type] || ALERT_TYPES.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg ${config.bgColor} ${className}`}>
      <Icon size={18} className={`${config.iconColor} flex-shrink-0 mt-0.5`} />
      <span className={`text-sm ${config.textColor}`}>{message || children}</span>
    </div>
  );
};
