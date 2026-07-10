import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import App from './App'
import SessionGuard from './components/SessionGuard'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider>
      <BrowserRouter>
        <SessionGuard><App /></SessionGuard>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
)
