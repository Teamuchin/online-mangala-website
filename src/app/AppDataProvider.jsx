import { AppDataContext, appData } from './appDataContext.js'

export function AppDataProvider({ children }) {
  return (
    <AppDataContext.Provider value={appData}>
      {children}
    </AppDataContext.Provider>
  )
}
