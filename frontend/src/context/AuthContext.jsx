import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const isValidToken = token && token !== 'undefined' && token !== 'null'
    if (isValidToken) {
      api.get('/auth/me')
        .then(r => {
          if (r.data && r.data.id) { setUser(r.data); localStorage.setItem('user', JSON.stringify(r.data)) }
          else { localStorage.removeItem('token'); localStorage.removeItem('user') }
        })
        .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null) })
        .finally(() => setLoading(false))
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const hasRole = (...roles) => roles.includes(user?.role)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
