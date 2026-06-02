import { createContext } from 'react'

export const GlobalHeaderContext = createContext({
  settingsContent: null,
  setSettingsContent: () => {},
  language: 'tr',
  setLanguage: () => {},
  t: (key) => key,
})
