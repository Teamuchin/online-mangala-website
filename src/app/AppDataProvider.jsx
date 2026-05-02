import { useEffect, useState } from 'react'
import { mergeStoredUser, updateUserProfile } from './appState.js'
import { AppDataContext, staticAppData } from './appDataContext.js'

const CURRENT_USER_STORAGE_KEY = 'mangala.currentUser'

export function AppDataProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === 'undefined') {
      return staticAppData.initialCurrentUser
    }

    const storedCurrentUser = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY)

    if (!storedCurrentUser) {
      return staticAppData.initialCurrentUser
    }

    try {
      return mergeStoredUser(
        staticAppData.initialCurrentUser,
        JSON.parse(storedCurrentUser),
      )
    } catch {
      return staticAppData.initialCurrentUser
    }
  })
  const [isAuthenticated, setIsAuthenticated] = useState(true)

  const updateCurrentUser = (updates) => {
    setCurrentUser((existingUser) => updateUserProfile(existingUser, updates))
  }

  useEffect(() => {
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser))
  }, [currentUser])

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
