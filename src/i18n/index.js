import en from './locales/en.json';

const translations = {
  en,
  // Add more languages here
  // es: require('./locales/es.json'),
  // fr: require('./locales/fr.json'),
};

let currentLanguage = 'en';

export const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
  }
};

export const getLanguage = () => {
  return currentLanguage || localStorage.getItem('language') || 'en';
};

export const t = (key, params = {}) => {
  const lang = getLanguage();
  const keys = key.split('.');
  let value = translations[lang] || translations.en;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to English
      value = translations.en;
      for (const fallbackKey of keys) {
        value = value?.[fallbackKey];
      }
      break;
    }
  }

  if (typeof value !== 'string') {
    return key; // Return key if translation not found
  }

  // Replace parameters
  return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
};

// Initialize language from localStorage or browser
if (typeof window !== 'undefined') {
  const savedLang = localStorage.getItem('language');
  const browserLang = navigator.language.split('-')[0];
  const initialLang = savedLang || (translations[browserLang] ? browserLang : 'en');
  setLanguage(initialLang);
}

export default { t, setLanguage, getLanguage };

