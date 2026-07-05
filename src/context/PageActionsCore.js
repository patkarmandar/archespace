import { createContext, useContext, useEffect } from 'react'

export const PageActionsContext = createContext(null)

export function useRegisterPageActions(actions) {
  const ctx = useContext(PageActionsContext)
  const setPageActions = ctx?.setPageActions

  useEffect(() => {
    if (!setPageActions) return undefined
    setPageActions(actions || {})
    return () => setPageActions({})
  }, [actions, setPageActions])
}

export function usePageActions() {
  const ctx = useContext(PageActionsContext)
  return ctx?.pageActions || {}
}
