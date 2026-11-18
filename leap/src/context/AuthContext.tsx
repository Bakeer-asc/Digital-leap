import { createContext, useContext, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '../types'
import * as api from '../services/api'

interface Auth {
  user: User | null
  /** Signs in and returns the authenticated User so callers can redirect by role. */
  signIn: (email: string, password: string) => Promise<User>
  signOut: () => void
}

const Ctx = createContext<Auth>({
  user: null,
  signIn: async () => { throw new Error('AuthProvider not mounted') },
  signOut: () => {},
})

export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => api.currentUser())
  const qc = useQueryClient()

  const signIn = async (email: string, password: string): Promise<User> => {
    const u = await api.login(email, password)
    setUser(u)
    qc.clear()
    return u
  }

  const signOut = () => {
    api.logout()
    setUser(null)
    qc.clear()
  }

  return <Ctx.Provider value={{ user, signIn, signOut }}>{children}</Ctx.Provider>
}
