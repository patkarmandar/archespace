import { createContext, useContext } from 'react'

export const EncryptionContext = createContext(null)

export function useEncryption() {
  const ctx = useContext(EncryptionContext)
  if (!ctx) throw new Error('useEncryption must be used within EncryptionProvider')
  return ctx
}
