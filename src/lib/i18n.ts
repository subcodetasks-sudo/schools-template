import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from '@/locales/en/common.json'
import arCommon from '@/locales/ar/common.json'

export const supportedLanguages = ['en', 'ar'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

const resources = {
  en: { common: enCommon },
  ar: { common: arCommon },
}

function applyDocumentLanguage(lng: string) {
  const language = lng.startsWith('ar') ? 'ar' : 'en'
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })
  .then(() => {
    applyDocumentLanguage(i18n.language)
  })

i18n.on('languageChanged', applyDocumentLanguage)

export default i18n
