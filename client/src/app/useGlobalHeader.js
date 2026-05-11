import { useContext } from 'react'
import { GlobalHeaderContext } from './globalHeaderContext.js'

export function useGlobalHeader() {
  return useContext(GlobalHeaderContext)
}
