import { useContext } from 'react'
import { AppDataContext } from './appDataContext.js'

export function useAppData() {
  return useContext(AppDataContext)
}
