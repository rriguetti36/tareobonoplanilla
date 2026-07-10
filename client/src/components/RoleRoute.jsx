import React from 'react'
import { Navigate } from 'react-router-dom'

export default function RoleRoute({ roles, children }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  return roles.includes(user?.role) ? children : <Navigate to="/dashboard" replace />
}
