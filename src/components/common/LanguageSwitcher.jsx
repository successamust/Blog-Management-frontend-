import React from 'react';
import { Globe } from 'lucide-react';
import { setLanguage, getLanguage } from '../../i18n';
import { motion } from 'framer-motion';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  // Add more languages as needed
  // { code: 'es', name: 'Español', flag: '🇪🇸' },
  // { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

const LanguageSwitcher = ({ className = '' }) => {
  const currentLang = getLanguage();
  const currentLanguage = languages.find(l => l.code === currentLang) || languages[0];

  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    window.location.reload(); // Reload to apply translations
  };

  if (languages.length <= 1) {
    return null; // Don't show if only one language
  }

  return (
    <div className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-subtle transition-colors"
        aria-label="Change language"
      >
        <Globe className="w-5 h-5" />
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="hidden sm:inline text-sm">{currentLanguage.name}</span>
      </motion.button>

      {/* Language Dropdown - Can be added if multiple languages */}
      {languages.length > 1 && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-[var(--border-subtle)] z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                lang.code === currentLang
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-secondary hover:bg-surface-subtle'
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;

