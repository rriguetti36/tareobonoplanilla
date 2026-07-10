import React, { useState } from 'react'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  VStack,
} from '@chakra-ui/react'

function BrandMark() {
  return (
    <Box className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <path d="M24 7a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
        <path d="M10 40c.8-8 5.5-12 14-12s13.2 4 14 12" />
        <path className="brand-mark__accent" d="m34 11 3 3 6-7" />
      </svg>
    </Box>
  )
}

export default function Login() {
  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const { data } = await api.post('/auth/login', { credential, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify({
        id: data.id,
        name: data.name,
        username: data.username,
        email: data.email,
        role: data.role || 'colaborador',
        companyId: data.companyId,
        company: data.company,
      }))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'No pudimos iniciar sesión. Inténtalo nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box className="login-page">
      <Box className="login-shell">
        <Box as="section" className="login-welcome">
          <Box className="login-brand">
            <BrandMark />
            <Box>
              <Text className="login-brand__name">Core RR. HH.</Text>
              <Text className="login-brand__tagline">Gestión de personas</Text>
            </Box>
          </Box>

          <Box className="welcome-copy">
            <Text className="welcome-copy__eyebrow">Tu equipo, en un solo lugar</Text>
            <Heading as="h1">
              Potencia el talento.<br />
              <Box as="span">Simplifica la gestión.</Box>
            </Heading>
            <Text>
              Accede a la información de tu equipo y acompaña cada etapa de su experiencia laboral.
            </Text>
          </Box>

          <Box className="login-feature">
            <Box className="login-feature__icon">✓</Box>
            <Box>
              <Text fontWeight="700">Información segura y centralizada</Text>
              <Text>Todo lo que necesitas para gestionar a tus colaboradores.</Text>
            </Box>
          </Box>
        </Box>

        <Box as="main" className="login-form-panel">
          <Box className="login-form-card">
            <Box mb={{ base: 7, md: 9 }}>
              <Text className="login-form-card__eyebrow">Bienvenido de vuelta</Text>
              <Heading as="h2" size="xl">Inicia sesión</Heading>
              <Text mt={2} color="gray.500">Ingresa tus credenciales para continuar.</Text>
            </Box>

            <Box as="form" onSubmit={handleSubmit}>
              <VStack spacing={5} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Usuario o correo corporativo</FormLabel>
                  <Input
                    type="text"
                    value={credential}
                    onChange={(event) => setCredential(event.target.value)}
                    placeholder="Ej. ADMIN"
                    autoComplete="username"
                    size="lg"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Contraseña</FormLabel>
                  <InputGroup size="lg">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Ingresa tu contraseña"
                      autoComplete="current-password"
                      pr="5.5rem"
                    />
                    <InputRightElement width="5.5rem">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="password-toggle"
                        onClick={() => setShowPassword((visible) => !visible)}
                      >
                        {showPassword ? 'Ocultar' : 'Ver'}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {error && <Alert status="error" borderRadius="12px">{error}</Alert>}

                <Button
                  type="submit"
                  className="login-submit"
                  size="lg"
                  isLoading={isLoading}
                  loadingText="Ingresando"
                >
                  Ingresar al portal
                </Button>
              </VStack>
            </Box>

            <Text className="login-help">
              ¿Problemas para ingresar? Contacta al equipo de Recursos Humanos.
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
