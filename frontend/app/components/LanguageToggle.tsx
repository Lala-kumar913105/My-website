"use client";

import React from 'react';
import { useI18n } from '@/app/i18n/context';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useI18n();

  const handleLanguageChange = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  return (
    <button
      onClick={handleLanguageChange}
      className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
    >
      <span className="text-sm font-medium">
        {language === 'en' ? 'हिंदी' : 'English'}
      </span>
    </button>
  );
};

export default LanguageToggle;