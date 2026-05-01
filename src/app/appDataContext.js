import { createContext } from 'react'
import {
  ACCOUNT_SETTINGS_FIELDS,
  APP_ASSETS,
  APP_BRAND_NAME,
  BANNER_ACTIONS,
  BANNER_NAV_LINKS,
  BANNER_SLOGAN_LINES,
  HOME_PRIMARY_ACTIONS,
  HOME_SECONDARY_ACTIONS,
  LOCAL_MATCH_PLAYERS,
  MOCK_ACCOUNT,
} from './mockAppData.js'

export const appData = {
  accountSettingsFields: ACCOUNT_SETTINGS_FIELDS,
  assets: APP_ASSETS,
  bannerActions: BANNER_ACTIONS,
  bannerNavLinks: BANNER_NAV_LINKS,
  bannerSloganLines: BANNER_SLOGAN_LINES,
  brandName: APP_BRAND_NAME,
  homePrimaryActions: HOME_PRIMARY_ACTIONS,
  homeSecondaryActions: HOME_SECONDARY_ACTIONS,
  localMatchPlayers: LOCAL_MATCH_PLAYERS,
  mockAccount: MOCK_ACCOUNT,
}

export const AppDataContext = createContext(appData)
