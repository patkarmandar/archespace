/**
 * PageActionsContext.jsx - Per-route actions for global shortcuts / palette.
 */
import { useState } from 'react'
import { PageActionsContext } from './PageActionsCore'

export function PageActionsProvider({ children }) {
  const [pageActions, setPageActions] = useState({})
  return (
    <PageActionsContext.Provider value={{ pageActions, setPageActions }}>
      {children}
    </PageActionsContext.Provider>
  )
}
