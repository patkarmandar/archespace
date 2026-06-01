/**
 * PageActionsContext.jsx - Per-route actions for global shortcuts / palette.
 */
import { createContext, useContext, useState, useEffect } from 'react'

const PageActionsContext = createContext(null)

export function PageActionsProvider({ children }) {
  const [pageActions, setPageActions] = useState({})
  return (
    <PageActionsContext.Provider value={{ pageActions, setPageActions }}>
      {children}
    </PageActionsContext.Provider>
  )
}

export function useRegisterPageActions(actions) {
  const ctx = useContext(PageActionsContext)
  if (!ctx) return
  const { setPageActions } = ctx
  useEffect(() => {
    setPageActions(actions || {})
    return () => setPageActions({})
  }, [actions, setPageActions])
}

export function usePageActions() {
  const ctx = useContext(PageActionsContext)
  return ctx?.pageActions || {}
}
