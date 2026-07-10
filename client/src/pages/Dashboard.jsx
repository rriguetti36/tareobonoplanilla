import React from 'react'
import { Box, Button, Heading, Text } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const navigate = useNavigate()

  return <Box>
    <Heading size="md" mb={4}>Dashboard</Heading>
    <Text mb={4}>Bienvenido{user ? `, ${user.name}` : ''}.</Text>
    {user?.company && <Text color="gray.500" mb={4}>Empresa: {user.company.tradeName || user.company.businessName}</Text>}
    {user?.role === 'admin' && <Button colorScheme="blue" onClick={() => navigate('/users/add')}>Crear usuario</Button>}
  </Box>
}
