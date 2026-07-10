import React, { useEffect, useMemo, useState } from 'react'
import {
  Avatar, Box, Button, Divider, Flex, FormControl, FormLabel, Grid, Heading,
  Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter,
  ModalHeader, ModalOverlay, Select, Spinner, Stack, Text,
} from '@chakra-ui/react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import CollaboratorAvatar from '../components/CollaboratorAvatar'
import { useToast } from '../services/alerts'

const emptyForm = {
  userId: '', employeeCode: '', documentType: 'DNI', documentNumber: '',
  firstName: '', lastName: '', email: '', phone: '', positionId: '',
  employmentTypeId: '', startDate: '', endDate: '', baseSalary: '', laborStatus: 'pending_hire', estado: 0,
}
const dateValue = (value) => value ? String(value).slice(0, 10) : ''
const initial = (value) => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase()
const employeeCode = (form) => `${initial(form.firstName)}${initial(form.lastName)}${String(form.documentNumber || '').trim().replace(/\s+/g, '').toUpperCase()}`
const laborStatuses = { pending_hire: 'Pendiente de alta', active: 'Activo', vacation: 'Vacaciones', leave: 'Licencia', suspended: 'Suspendido', terminated: 'Cesado' }

export default function CollaboratorForm() {
  const { id } = useParams()
  const isNew = !id
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null')
  const canManage = ['admin', 'rrhh'].includes(currentUser?.role)
  const [form, setForm] = useState(emptyForm)
  const [positions, setPositions] = useState([])
  const [employmentTypes, setEmploymentTypes] = useState([])
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userSaving, setUserSaving] = useState(false)
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'colaborador', estado: 1 })
  const toast = useToast()
  const navigate = useNavigate()
  const preview = useMemo(() => photo ? URL.createObjectURL(photo) : null, [photo])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  useEffect(() => {
    const requests = [api.get('/core/positions'), api.get('/core/employment-types'), api.get('/users'), api.get('/core/roles')]
    if (!isNew) requests.push(api.get(`/collaborators/${id}`))
    Promise.all(requests).then(([positionData, typeData, userData, roleData, collaboratorData]) => {
      setPositions(positionData.data)
      setEmploymentTypes(typeData.data)
      setUsers(userData.data)
      setRoles(roleData.data)
      if (collaboratorData) setForm({ ...collaboratorData.data, userId: collaboratorData.data.userId || '', startDate: dateValue(collaboratorData.data.startDate), endDate: dateValue(collaboratorData.data.endDate) })
    }).catch((error) => toast({ title: 'No se pudo cargar la ficha', description: error.response?.data?.error, status: 'error' }))
      .finally(() => setLoading(false))
  }, [id])

  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const openUserModal = () => {
    setUserForm({ name: `${form.firstName} ${form.lastName}`.trim(), email: form.email || '', password: '', role: 'colaborador', estado: 1 })
    setUserModalOpen(true)
  }
  const createUser = async () => {
    setUserSaving(true)
    try {
      const { data } = await api.post('/users', userForm)
      setUsers((current) => [...current, data])
      setForm((current) => ({ ...current, userId: data.id }))
      setUserModalOpen(false)
      toast({ title: 'Usuario creado y vinculado', status: 'success', duration: 2500 })
    } catch (error) {
      toast({ title: 'No se pudo crear el usuario', description: error.response?.data?.error || error.message, status: 'error', duration: 3500 })
    } finally { setUserSaving(false) }
  }
  const save = async (event) => {
    event.preventDefault()
    const required = [
      ['firstName', 'Nombres'], ['lastName', 'Apellidos'], ['documentNumber', 'Número de documento'],
      ['positionId', 'Cargo'], ['employmentTypeId', 'Tipo de vínculo'],
    ]
    const missing = required.filter(([field]) => !String(form[field] ?? '').trim()).map(([, label]) => label)
    if (missing.length) {
      toast({ title: 'Faltan datos obligatorios', description: missing.join(', '), status: 'warning' })
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, employeeCode: employeeCode(form), userId: form.userId || null, positionId: Number(form.positionId), employmentTypeId: Number(form.employmentTypeId), estado: Number(form.estado) }
      const { data } = isNew ? await api.post('/collaborators', payload) : await api.put(`/collaborators/${id}`, payload)
      if (photo) {
        const body = new FormData()
        body.append('photo', photo)
        await api.put(`/collaborators/${data.id}/photo`, body)
      }
      toast({ title: 'Ficha guardada correctamente', status: 'success', duration: 2500 })
      navigate('/collaborators')
    } catch (error) {
      toast({ title: 'No se pudo guardar', description: error.response?.data?.error || error.message, status: 'error', duration: 3500 })
    } finally { setSaving(false) }
  }

  if (loading) return <Flex justify="center" py={16}><Spinner /></Flex>
  return (
    <Box as="form" onSubmit={save}>
      <Flex justify="space-between" align="center" mb={7}>
        <Box><Text color="teal.600" fontWeight="700" fontSize="sm">FICHA DE DATOS</Text><Heading size="lg">{isNew ? 'Nuevo colaborador' : `${form.firstName} ${form.lastName}`}</Heading></Box>
        <Flex gap={3}><Button variant="outline" onClick={() => navigate('/collaborators')}>Volver</Button>{canManage && <Button type="submit" colorScheme="teal" isLoading={saving}>Guardar ficha</Button>}</Flex>
      </Flex>

      <Grid templateColumns={{ base: '1fr', lg: '280px 1fr' }} gap={6} alignItems="start">
        <Box bg="white" borderWidth="1px" borderRadius="xl" p={6} textAlign="center">
          {preview ? <Avatar size="2xl" src={preview} name={`${form.firstName} ${form.lastName}`} /> : <CollaboratorAvatar collaborator={form} size="2xl" />}
          <Heading size="sm" mt={4}>{form.firstName || 'Nuevo'} {form.lastName || 'colaborador'}</Heading>
          <Text color="gray.500" fontSize="sm" mt={1}>{employeeCode(form) || 'Código pendiente'}</Text>
          {canManage && <FormControl mt={6}><FormLabel textAlign="left" fontSize="sm">Fotografía</FormLabel><Input type="file" accept="image/jpeg,image/png,image/webp" p={1} onChange={(e) => setPhoto(e.target.files?.[0] || null)} /><Text fontSize="xs" color="gray.500" mt={2}>JPG, PNG o WebP. Máximo 5 MB.</Text></FormControl>}
        </Box>

        <Stack spacing={6}>
          <Box bg="white" borderWidth="1px" borderRadius="xl" p={6}>
            <Heading size="md">Información personal</Heading><Divider my={5} />
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={5}>
              <FormControl isRequired><FormLabel>Nombres</FormLabel><Input isReadOnly={!canManage} name="firstName" value={form.firstName} onChange={change} /></FormControl>
              <FormControl isRequired><FormLabel>Apellidos</FormLabel><Input isReadOnly={!canManage} name="lastName" value={form.lastName} onChange={change} /></FormControl>
              <FormControl><FormLabel>Tipo de documento</FormLabel><Select isDisabled={!canManage} name="documentType" value={form.documentType} onChange={change}><option value="DNI">DNI</option><option value="CE">CE</option><option value="PASAPORTE">Pasaporte</option></Select></FormControl>
              <FormControl isRequired><FormLabel>Número de documento</FormLabel><Input isReadOnly={!canManage} name="documentNumber" value={form.documentNumber} onChange={change} /></FormControl>
              <FormControl><FormLabel>Email</FormLabel><Input isReadOnly={!canManage} type="email" name="email" value={form.email || ''} onChange={change} /></FormControl>
              <FormControl><FormLabel>Teléfono</FormLabel><Input isReadOnly={!canManage} name="phone" value={form.phone || ''} onChange={change} /></FormControl>
            </Grid>
          </Box>

          <Box bg="white" borderWidth="1px" borderRadius="xl" p={6}>
            <Heading size="md">Información laboral</Heading><Divider my={5} />
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={5}>
              <FormControl isRequired><FormLabel>Código de colaborador</FormLabel><Input isReadOnly value={employeeCode(form)} placeholder="Se genera con nombre, apellido y documento" /><Text fontSize="xs" color="gray.500" mt={1}>Generado automáticamente.</Text></FormControl>
              <FormControl><FormLabel>Usuario vinculado</FormLabel><Flex gap={2}><Select isDisabled={!canManage} name="userId" value={form.userId} onChange={change}><option value="">Sin usuario</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</Select>{canManage && !form.userId && <Button type="button" colorScheme="teal" variant="outline" flexShrink={0} onClick={openUserModal}>Crear usuario</Button>}</Flex></FormControl>
              <FormControl isRequired><FormLabel>Cargo</FormLabel><Select isDisabled={!canManage} name="positionId" value={form.positionId} onChange={change}><option value="">Seleccionar</option>{positions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></FormControl>
              <FormControl isRequired><FormLabel>Tipo de vínculo</FormLabel><Select isDisabled={!canManage} name="employmentTypeId" value={form.employmentTypeId} onChange={change}><option value="">Seleccionar</option>{employmentTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></FormControl>
              <FormControl><FormLabel>Sueldo base</FormLabel><Input isReadOnly={!canManage} type="number" min="0" step="0.01" name="baseSalary" value={form.baseSalary||''} onChange={change}/><Text fontSize="xs" color="gray.500" mt={1}>Base predeterminada para bonos porcentuales.</Text></FormControl>
              <FormControl><FormLabel>Fecha de ingreso</FormLabel><Input isReadOnly type="date" name="startDate" value={form.startDate || ''} /><Text fontSize="xs" color="gray.500" mt={1}>Se asigna al aprobar el Alta.</Text></FormControl>
              <FormControl><FormLabel>Fecha de fin</FormLabel><Input isReadOnly type="date" name="endDate" value={form.endDate || ''} /><Text fontSize="xs" color="gray.500" mt={1}>Se asigna al aprobar la Baja.</Text></FormControl>
              <FormControl><FormLabel>Estado laboral</FormLabel><Input isReadOnly value={laborStatuses[form.laborStatus] || (form.estado ? 'Activo' : 'Inactivo')} /><Text fontSize="xs" color="gray.500" mt={1}>Se actualiza mediante los procesos aprobados.</Text></FormControl>
            </Grid>
          </Box>
        </Stack>
      </Grid>
      <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} isCentered>
        <ModalOverlay /><ModalContent><ModalHeader>Registrar usuario</ModalHeader><ModalCloseButton />
          <ModalBody><Stack spacing={4}>
            <FormControl isRequired><FormLabel>Nombre</FormLabel><Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></FormControl>
            <FormControl isRequired><FormLabel>Email</FormLabel><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></FormControl>
            <FormControl isRequired><FormLabel>Contraseña</FormLabel><Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></FormControl>
            <FormControl><FormLabel>Rol</FormLabel><Select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>{roles.map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}</Select></FormControl>
          </Stack></ModalBody>
          <ModalFooter><Button type="button" variant="ghost" mr={3} onClick={() => setUserModalOpen(false)}>Cancelar</Button><Button type="button" colorScheme="teal" onClick={createUser} isLoading={userSaving}>Registrar y vincular</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}
