import { useEffect, useState } from 'react'
import {
  buildAuthenticatedSessionUpdates,
  buildLoggedOutSessionUpdates,
  mergeStoredAuthState,
  mergeStoredUser,
  updateUserProfile,
} from './appState.js'
import { AppDataContext, staticAppData } from './appDataContext.js'

const AUTH_STATE_STORAGE_KEY = 'mangala.authState'
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    const storedAuthState = window.localStorage.getItem(AUTH_STATE_STORAGE_KEY)

    if (!storedAuthState) {
      return true
    }

    try {
      return mergeStoredAuthState(
        { isAuthenticated: true },
        JSON.parse(storedAuthState),
      ).isAuthenticated
    } catch {
      return true
    }
  })

  const updateCurrentUser = (updates) => {
    setCurrentUser((existingUser) => updateUserProfile(existingUser, updates))
  }

  const logIn = (userOverrides = {}) => {
    const session = buildAuthenticatedSessionUpdates(
      staticAppData.initialCurrentUser,
      userOverrides,
    )
    setCurrentUser(session.currentUser)
    setIsAuthenticated(session.isAuthenticated)
  }

  const registerUser = (userOverrides = {}) => {
    logIn(userOverrides)
  }

  const continueAsGuest = () => {
    logIn({
      username: 'Guest',
      email: 'guest@example.com',
      bio: 'Playing as guest',
    })
  }

  const logOut = () => {
    setIsAuthenticated(buildLoggedOutSessionUpdates().isAuthenticated)
  }

  useEffect(() => {
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser))
  }, [currentUser])

  useEffect(() => {
    window.localStorage.setItem(
      AUTH_STATE_STORAGE_KEY,
      JSON.stringify({ isAuthenticated }),
    )
  }, [isAuthenticated])

  const value = {
    ...staticAppData,
    continueAsGuest,
    currentUser,
    isAuthenticated,
    logIn,
    logOut,
    registerUser,
    setIsAuthenticated,
    updateCurrentUser,
  }

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  )
}
