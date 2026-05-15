import { createContext } from 'react'
import {
  ACCOUNT_SETTINGS_FIELDS,
  APP_ASSETS,
  APP_BRAND_NAME,
  BANNER_ACTIONS,
  BANNER_NAV_LINKS,
  BANNER_SLOGAN_LINES,
  GUEST_CURRENT_USER,
  HOME_PRIMARY_ACTIONS,
  HOME_SECONDARY_ACTIONS,
  INITIAL_CURRENT_USER,
  LOCAL_MATCH_PLAYERS,
  PUBLIC_PROFILE_DIRECTORY,
} from './mockAppData.js'

export const staticAppData = {
  accountSettingsFields: ACCOUNT_SETTINGS_FIELDS,
  assets: APP_ASSETS,
  bannerActions: BANNER_ACTIONS,
  bannerNavLinks: BANNER_NAV_LINKS,
  bannerSloganLines: BANNER_SLOGAN_LINES,
  brandName: APP_BRAND_NAME,
  homePrimaryActions: HOME_PRIMARY_ACTIONS,
  homeSecondaryActions: HOME_SECONDARY_ACTIONS,
  guestCurrentUser: GUEST_CURRENT_USER,
  initialCurrentUser: INITIAL_CURRENT_USER,
  localMatchPlayers: LOCAL_MATCH_PLAYERS,
  publicProfileDirectory: PUBLIC_PROFILE_DIRECTORY,
}

export const AppDataContext = createContext({
  ...staticAppData,
  activeMatchSummary: null,
  currentUser: INITIAL_CURRENT_USER,
  isAuthenticated: true,
  continueAsGuest: () => {},
  logIn: () => {},
  logOut: () => {},
  recordPublicProfileMatchResult: () => {},
  registerUser: () => {},
  setIsAuthenticated: () => {},
  updateCurrentUser: () => {},
})
