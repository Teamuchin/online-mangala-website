import { useState } from 'react'
import { updateUserProfile } from './appState.js'
import { AppDataContext, staticAppData } from './appDataContext.js'

export function AppDataProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(staticAppData.initialCurrentUser)
  const [isAuthenticated, setIsAuthenticated] = useState(true)

  const updateCurrentUser = (updates) => {
    setCurrentUser((existingUser) => updateUserProfile(existingUser, updates))
  }

  const value = {
    ...staticAppData,
    currentUser,
    isAuthenticated,
    setIsAuthenticated,
    updateCurrentUser,
  }

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  )
}
