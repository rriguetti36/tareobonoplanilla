import React, { useEffect, useState } from 'react'
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Spinner,
  Flex,
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  FormControl,
  FormLabel,
  Input,
  ModalFooter,
  Select,
} from '@chakra-ui/react'
import { AddIcon, EditIcon, DeleteIcon, UnlockIcon } from '@chakra-ui/icons'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { confirmAction, useToast } from '../services/alerts'

export default function UserList() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [passwordData, setPasswordData] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editData, setEditData] = useState({ name: '', email: '', role: 'colaborador', estado: 1 })
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    loadUsers()
    api.get('/core/roles')
      .then(({ data }) => setRoles(data))
      .catch(() => setRoles([]))
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users')
      setUsers(res.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!await confirmAction({ title: 'Eliminar usuario', text: 'Esta acción desactivará el acceso del usuario.', confirmText: 'Sí, eliminar', icon: 'warning' })) return
    setDeletingId(id)
    try {
      await api.delete(`/users/${id}`)
      toast({ title: 'Usuario eliminado', status: 'success', duration: 3000, isClosable: true })
      loadUsers()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error', duration: 3000, isClosable: true })
    } finally {
      setDeletingId(null)
    }
  }

  const openEdit = (user) => {
    setSelectedUser(user)
    setEditData({
      name: user.name,
      email: user.email,
      role: user.role || 'colaborador',
      estado: user.estado ? 1 : 0,
    })
    setIsEditOpen(true)
  }

  const openPassword = (user) => {
    setSelectedUser(user)
    setPasswordData('')
    setIsPasswordOpen(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    setSaving(true)
    try {
      await api.put(`/users/${selectedUser.id}`, {
        name: editData.name,
        email: editData.email,
        role: editData.role,
        estado: Number(editData.estado),
      })
      toast({ title: 'Usuario actualizado', status: 'success', duration: 3000, isClosable: true })
      setIsEditOpen(false)
      setSelectedUser(null)
      loadUsers()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error', duration: 3000, isClosable: true })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser) return
    if (!passwordData) {
      toast({ title: 'Error', description: 'Ingresa una nueva contraseña', status: 'error', duration: 3000, isClosable: true })
      return
    }
    setSaving(true)
    try {
      await api.put(`/users/${selectedUser.id}/password`, { password: passwordData })
      toast({ title: 'Contraseña actualizada', status: 'success', duration: 3000, isClosable: true })
      setIsPasswordOpen(false)
      setSelectedUser(null)
      setPasswordData('')
      loadUsers()
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.error || err.message, status: 'error', duration: 3000, isClosable: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Usuarios</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={() => navigate('/users/add')}>
          Agregar +
        </Button>
      </Flex>

      {loading ? (
        <Spinner />
      ) : error ? (
        <Text color="red.500">{error}</Text>
      ) : (
        <Box overflowX="auto" bg="white" boxShadow="sm" borderRadius="md" p={4}>
          <Table variant="simple">
            <Thead bg="gray.100">
              <Tr>
                <Th>Nombre</Th>
                <Th>Email</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td>{user.name}</Td>
                  <Td>{user.email}</Td>
                  <Td>{user.role || 'colaborador'}</Td>
                  <Td>{user.estado ? 'activo' : 'inactivo'}</Td>
                  <Td>
                    <Flex gap={2}>
                      <IconButton aria-label="Editar" icon={<EditIcon />} size="sm" onClick={() => openEdit(user)} />
                      <IconButton aria-label="Eliminar" icon={<DeleteIcon />} size="sm" colorScheme="red" isLoading={deletingId === user.id} onClick={() => handleDelete(user.id)} />
                      <IconButton aria-label="Cambiar contraseña" icon={<UnlockIcon />} size="sm" colorScheme="yellow" onClick={() => openPassword(user)} />
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Editar usuario</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box as="form" onSubmit={handleEditSubmit}>
              <FormControl mb={4} isRequired>
                <FormLabel>Nombre</FormLabel>
                <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
              </FormControl>
              <FormControl mb={4} isRequired>
                <FormLabel>Email</FormLabel>
                <Input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>Rol</FormLabel>
                <Select value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })}>
                  {roles.map((role) => (
                    <option key={role.code} value={role.code}>{role.name}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl mb={4}>
                <FormLabel>Estado</FormLabel>
                <Select value={editData.estado} onChange={(e) => setEditData({ ...editData, estado: Number(e.target.value) })}>
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo</option>
                </Select>
              </FormControl>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button colorScheme="blue" onClick={handleEditSubmit} isLoading={saving}>
              Guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cambiar contraseña</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Nueva contraseña</FormLabel>
              <Input type="password" value={passwordData} onChange={(e) => setPasswordData(e.target.value)} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsPasswordOpen(false)}>
              Cancelar
            </Button>
            <Button colorScheme="blue" onClick={handlePasswordSubmit} isLoading={saving}>
              Guardar contraseña
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}
