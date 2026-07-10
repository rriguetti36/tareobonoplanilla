import React, { useEffect, useState } from 'react'
import {
  Box,
  Heading,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Flex,
} from '@chakra-ui/react'
import { ArrowBackIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../services/alerts'

export default function CreateUser() {
  const [roles, setRoles] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'colaborador',
    estado: 1,
  })
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/core/roles')
      .then(({ data }) => setRoles(data))
      .catch(() => setRoles([]))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'estado' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/users', formData)
      toast({ title: 'Usuario creado', status: 'success', duration: 3000, isClosable: true })
      navigate('/users')
    } catch (error) {
      toast({ title: 'Error', description: error.response?.data?.error || 'Error al crear usuario', status: 'error', duration: 3000, isClosable: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Crear Usuario</Heading>
        <Button leftIcon={<ArrowBackIcon />} variant="outline" onClick={() => navigate('/users')}>
          Volver al listado
        </Button>
      </Flex>

      <Box p={6} bg="white" boxShadow="lg" borderRadius="md">
        <form onSubmit={handleSubmit}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Nombre</FormLabel>
              <Input name="name" value={formData.name} onChange={handleChange} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Contraseña</FormLabel>
              <Input type="password" name="password" value={formData.password} onChange={handleChange} />
            </FormControl>
            <FormControl>
              <FormLabel>Rol</FormLabel>
              <Select name="role" value={formData.role} onChange={handleChange}>
                {roles.map((role) => (
                  <option key={role.code} value={role.code}>{role.name}</option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Estado</FormLabel>
              <Select name="estado" value={formData.estado} onChange={handleChange}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </Select>
            </FormControl>
            <Flex gap={3}>
              <Button type="submit" colorScheme="blue" isLoading={saving}>
                Guardar
              </Button>
              <Button variant="outline" onClick={() => navigate('/users')}>
                Cancelar
              </Button>
            </Flex>
          </VStack>
        </form>
      </Box>
    </Box>
  )
}
