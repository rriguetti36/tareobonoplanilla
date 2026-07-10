import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const getExpiration = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded))
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export default function SessionGuard({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return undefined
    const expiration = getExpiration(token)
    const logout = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      navigate('/', { replace: true, state: { sessionExpired: true } })
    }
    if (!expiration || expiration <= Date.now()) {
      logout()
      return undefined
    }
    const timer = window.setTimeout(logout, expiration - Date.now())
    return () => window.clearTimeout(timer)
  }, [location.pathname, navigate])

  return children
}
