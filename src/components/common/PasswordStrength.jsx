import React from 'react';
import { validatePassword, getPasswordStrengthLabel } from '../../utils/securityUtils';

const PasswordStrength = ({ password, requirements = {} }) => {
  if (!password) {
    return null;
  }

  const validation = validatePassword(password, requirements);
  const { label, color } = getPasswordStrengthLabel(validation.strength);
  
  // Ensure "Strong" passwords show full bar
  const barWidth = label === 'Strong' ? 100 : validation.strength;

  const getColorClass = (color) => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTextColorClass = (color) => {
    switch (color) {
      case 'red': return 'text-red-600 dark:text-red-400';
      case 'orange': return 'text-orange-600 dark:text-orange-400';
      case 'yellow': return 'text-yellow-600 dark:text-yellow-400';
      case 'green': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--text-secondary)]">Password strength</span>
        <span className={`text-xs font-medium ${getTextColorClass(color)}`}>{label}</span>
      </div>
      <div className="w-full bg-[var(--surface-subtle)] rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${getColorClass(color)}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {validation.errors.length > 0 && (
        <ul className="mt-2 text-xs text-[var(--text-muted)] space-y-1">
          {validation.errors.map((error, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="text-red-500">•</span>
              {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrength;

