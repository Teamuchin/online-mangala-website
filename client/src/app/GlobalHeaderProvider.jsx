import { useMemo, useState } from 'react'
import { GlobalHeaderContext } from './globalHeaderContext.js'
import { DEFAULT_LANGUAGE, translations } from './translations.js'

const LANGUAGE_STORAGE_KEY = 'mangala.language'

function getNestedTranslation(language, key) {
  return key.split('.').reduce((currentValue, segment) => currentValue?.[segment], translations[language])
}

function interpolateTranslation(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))
}

export function GlobalHeaderProvider({ children }) {
  const [settingsContent, setSettingsContent] = useState(null)
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_LANGUAGE
    }

    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return storedLanguage && translations[storedLanguage] ? storedLanguage : DEFAULT_LANGUAGE
  })

  const value = useMemo(
    () => ({
      settingsContent,
      setSettingsContent,
      language,
      setLanguage: (nextLanguage) => {
        if (!translations[nextLanguage]) {
          return
        }

        setLanguage(nextLanguage)

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
        }
      },
      t: (key, values) => {
        const template =
          getNestedTranslation(language, key) ??
          getNestedTranslation(DEFAULT_LANGUAGE, key) ??
          key

        return interpolateTranslation(template, values)
      },
    }),
    [language, settingsContent],
  )

  return (
    <GlobalHeaderContext.Provider value={value}>
      {children}
    </GlobalHeaderContext.Provider>
  )
}
