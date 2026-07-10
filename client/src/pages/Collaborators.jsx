import React, { useEffect, useState } from 'react'
import { Badge, Box, Button, Flex, Heading, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import CollaboratorAvatar from '../components/CollaboratorAvatar'
import { useToast } from '../services/alerts'

const laborStatuses = { pending_hire: 'Pendiente de alta', active: 'Activo', vacation: 'Vacaciones', leave: 'Licencia', suspended: 'Suspendido', terminated: 'Cesado' }
const laborColors = { pending_hire: 'orange', active: 'green', vacation: 'blue', leave: 'purple', suspended: 'yellow', terminated: 'gray' }

export default function Collaborators() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const canManage = ['admin', 'rrhh'].includes(user?.role)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    api.get('/collaborators')
      .then(({ data }) => setItems(data))
      .catch((error) => toast({ title: 'No se pudieron cargar los colaboradores', description: error.response?.data?.error, status: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={7}>
        <Box><Heading size="lg">Colaboradores</Heading><Text color="gray.500" mt={2}>Fichas del personal de la empresa.</Text></Box>
        {canManage && <Button colorScheme="teal" onClick={() => navigate('/collaborators/new')}>Nuevo colaborador</Button>}
      </Flex>
      <Box bg="white" borderRadius="xl" borderWidth="1px" overflowX="auto">
        {loading ? <Flex justify="center" py={12}><Spinner /></Flex> : (
          <Table><Thead bg="gray.50"><Tr><Th>Foto</Th><Th>Código</Th><Th>Colaborador</Th><Th>Cargo</Th><Th>Cliente / local</Th><Th>Vínculo</Th><Th>Estado</Th><Th /></Tr></Thead>
            <Tbody>{items.map((item) => <Tr key={item.id}>
              <Td><CollaboratorAvatar collaborator={item} /></Td><Td>{item.employeeCode}</Td>
              <Td fontWeight="600">{item.lastName}, {item.firstName}</Td><Td>{item.positionName}</Td>
              <Td>{item.clientName ? `${item.clientName} / ${item.siteName || 'Sin local'}` : 'Sin asignación'}</Td><Td>{item.employmentTypeName}</Td>
              <Td><Badge colorScheme={laborColors[item.laborStatus] || (item.estado ? 'green' : 'gray')}>{laborStatuses[item.laborStatus] || (item.estado ? 'Activo' : 'Inactivo')}</Badge></Td>
              <Td><Button size="sm" variant="outline" onClick={() => navigate(`/collaborators/${item.id}`)}>Ver ficha</Button></Td>
            </Tr>)}</Tbody>
          </Table>
        )}
      </Box>
    </Box>
  )
}
