import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '../types'

type UserContextValue = {
  currentUser: User | null
  allUsers: User[]
  login: (user: User) => void
  logout: () => void
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  allUsers: [],
  login: () => {},
  logout: () => {},
})

const STORAGE_KEY = 'ai-workspace-user'

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(loadStoredUser)
  const [allUsers, setAllUsers] = useState<User[]>([])

  useEffect(() => {
    fetch('/api/data/users')
      .then((r) => r.json())
      .then((users: User[]) => setAllUsers(users))
      .catch(() => {})
  }, [])

  function login(user: User) {
    setCurrentUser(user)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)) } catch {}
  }

  function logout() {
    setCurrentUser(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <UserContext.Provider value={{ currentUser, allUsers, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
