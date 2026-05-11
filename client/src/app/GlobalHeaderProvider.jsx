import { useMemo, useState } from 'react'
import { GlobalHeaderContext } from './globalHeaderContext.js'

export function GlobalHeaderProvider({ children }) {
  const [settingsContent, setSettingsContent] = useState(null)

  const value = useMemo(
    () => ({
      settingsContent,
      setSettingsContent,
    }),
    [settingsContent],
  )

  return (
    <GlobalHeaderContext.Provider value={value}>
      {children}
    </GlobalHeaderContext.Provider>
  )
}
