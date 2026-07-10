import React, { useEffect, useState } from 'react'
import {
  Badge, Box, Button, Checkbox, Flex, FormControl, FormLabel, Grid, Heading, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader,
  ModalOverlay, Select, Spinner, Table, Tbody, Td, Text, Textarea, Th,
  Thead, Tr,
} from '@chakra-ui/react'
import api from '../services/api'
import { confirmAction, useToast } from '../services/alerts'
import { peruDate } from '../utils/date'
import CollaboratorAvatar from '../components/CollaboratorAvatar'

const today = () => peruDate()

export default function Assignments() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const canManage = ['admin', 'rrhh', 'operaciones'].includes(user?.role)
  const [workers, setWorkers] = useState([])
  const [clients, setClients] = useState([])
  const [sites, setSites] = useState([])
  const [areas, setAreas] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [personnelType, setPersonnelType] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [isBulk, setIsBulk] = useState(false)
  const [form, setForm] = useState({ clientId: '', siteId: '', areaId: '', shiftId: '', startDate: today(), notes: '' })
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/operational/assignments'), api.get('/organization/clients'),
      api.get('/organization/sites'), api.get('/core/areas'), api.get('/operational/shifts'),
    ]).then(([workersData, clientsData, sitesData, areasData, shiftsData]) => {
      setWorkers(workersData.data)
      setClients(clientsData.data.filter((item) => item.estado))
      setSites(sitesData.data.filter((item) => item.estado))
      setAreas(areasData.data.filter((item) => item.estado))
      setShifts(shiftsData.data.filter((item) => item.estado))
    }).catch((error) => toast({ title: 'No se pudo cargar la asignación', description: error.response?.data?.error, status: 'error' }))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const assign = (worker) => {
    setSelected(worker)
    setIsBulk(false)
    const keepsMultiple = worker.positionCode === 'supervisor'
    setForm({ clientId: keepsMultiple ? '' : (worker.clientId || ''), siteId: keepsMultiple ? '' : (worker.siteId || ''), areaId: keepsMultiple ? '' : (worker.areaId || ''), shiftId: keepsMultiple ? '' : (worker.shiftId || ''), startDate: today(), notes: '' })
    setOpen(true)
  }
  const openBulk = () => {
    setSelected(null)
    setIsBulk(true)
    setForm({ clientId: '', siteId: '', areaId: '', shiftId: '', startDate: today(), notes: '' })
    setOpen(true)
  }
  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, clientId: Number(form.clientId), siteId: Number(form.siteId), areaId: Number(form.areaId), shiftId: Number(form.shiftId) }
      if (isBulk) await api.post('/operational/assignments/bulk', { ...payload, collaboratorIds: selectedIds })
      else await api.post('/operational/assignments', { ...payload, collaboratorId: selected.collaboratorId })
      toast({ title: isBulk ? `${selectedIds.length} colaboradores asignados` : 'Asignación actualizada', status: 'success' })
      setOpen(false)
      if (isBulk) setSelectedIds([])
      load()
    } catch (error) {
      toast({ title: 'No se pudo asignar', description: error.response?.data?.error, status: 'error' })
    } finally { setSaving(false) }
  }
  const showHistory = async (worker) => {
    setSelected(worker)
    const { data } = await api.get(`/operational/assignments/${worker.collaboratorId}/history`)
    setHistory(data)
    setHistoryOpen(true)
  }
  const endAssignment = async (assignmentId) => {
    if (!await confirmAction({ title: 'Finalizar asignación', text: 'La asignación vigente quedará cerrada.', confirmText: 'Sí, finalizar', icon: 'warning' })) return
    try {
      await api.put(`/operational/assignments/${assignmentId}/end`, { endDate: today() })
      const { data } = await api.get(`/operational/assignments/${selected.collaboratorId}/history`)
      setHistory(data)
      load()
      toast({ title: 'Asignación finalizada', status: 'success' })
    } catch (error) {
      toast({ title: 'No se pudo finalizar', description: error.response?.data?.error, status: 'error' })
    }
  }
  const normalizedSearch = search.trim().toLowerCase()
  const filteredWorkers = workers.filter((worker) =>
    (personnelType === 'all' || worker.positionCode === personnelType) &&
    (!normalizedSearch || `${worker.firstName} ${worker.lastName} ${worker.employeeCode} ${worker.documentNumber || ''}`.toLowerCase().includes(normalizedSearch)))
  const allVisibleSelected = filteredWorkers.length > 0 && filteredWorkers.every((worker) => selectedIds.includes(worker.collaboratorId))
  const toggleAll = () => setSelectedIds(allVisibleSelected
    ? selectedIds.filter((id) => !filteredWorkers.some((worker) => worker.collaboratorId === id))
    : [...new Set([...selectedIds, ...filteredWorkers.map((worker) => worker.collaboratorId)])])
  const toggleOne = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return (
    <Box>
      <Flex justify="space-between" align="start" gap={4} mb={7}>
        <Box><Heading size="lg">Asignación de personal</Heading><Text color="gray.500" mt={2}>Cliente, sede y turno vigente del personal operativo.</Text></Box>
        {canManage && <Button colorScheme="teal" isDisabled={!selectedIds.length} onClick={openBulk}>Asignar seleccionados ({selectedIds.length})</Button>}
      </Flex>
      <Box bg="white" borderWidth="1px" borderRadius="xl" p={4} mb={4}>
        <Flex gap={3} flexWrap="wrap">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, código o documento..." maxW="480px" />
          <Select value={personnelType} onChange={(event) => setPersonnelType(event.target.value)} maxW="220px">
            <option value="all">Todo el personal</option><option value="operario">Operarios</option><option value="supervisor">Supervisores</option>
          </Select>
        </Flex>
      </Box>
      <Box bg="white" borderWidth="1px" borderRadius="xl" overflowX="auto">
        {loading ? <Flex justify="center" py={12}><Spinner /></Flex> : (
          <Table><Thead bg="gray.50"><Tr>{canManage && <Th><Checkbox isChecked={allVisibleSelected} isIndeterminate={selectedIds.length > 0 && !allVisibleSelected} onChange={toggleAll} /></Th>}<Th>Personal</Th><Th>Cargo</Th><Th>Código</Th><Th>Asignación vigente</Th><Th>Estado</Th><Th /></Tr></Thead>
            <Tbody>{filteredWorkers.map((worker) => (
              <Tr key={worker.collaboratorId}>
                {canManage && <Td><Checkbox isChecked={selectedIds.includes(worker.collaboratorId)} onChange={() => toggleOne(worker.collaboratorId)} /></Td>}
                <Td><Flex align="center" gap={3}><CollaboratorAvatar collaborator={{ id: worker.collaboratorId, firstName: worker.firstName, lastName: worker.lastName, photoPath: worker.photoPath }} /><Text fontWeight="600">{worker.lastName}, {worker.firstName}</Text></Flex></Td>
                <Td>{worker.positionName}</Td><Td>{worker.employeeCode}</Td><Td maxW="420px">{worker.assignmentSummary || '—'}</Td>
                <Td><Badge colorScheme={worker.assignmentCount ? 'green' : 'orange'}>{worker.assignmentCount ? `${worker.assignmentCount} vigente${worker.assignmentCount > 1 ? 's' : ''}` : 'Pendiente'}</Badge></Td>
                <Td><Flex gap={2}>{canManage && <Button size="sm" colorScheme="teal" variant="outline" onClick={() => assign(worker)}>{worker.positionCode === 'supervisor' && worker.assignmentCount ? 'Agregar alcance' : (worker.assignmentId ? 'Reasignar' : 'Asignar')}</Button>}<Button size="sm" variant="ghost" onClick={() => showHistory(worker)}>Historial</Button></Flex></Td>
              </Tr>
            ))}</Tbody>
          </Table>
        )}
      </Box>

      <Modal isOpen={open} onClose={() => setOpen(false)} isCentered>
        <ModalOverlay /><ModalContent><ModalHeader>{isBulk ? `Asignar ${selectedIds.length} colaboradores` : (selected?.positionCode === 'supervisor' ? 'Agregar alcance de supervisión' : `${selected?.assignmentId ? 'Reasignar' : 'Asignar'} operario`)}</ModalHeader><ModalCloseButton />
          <ModalBody>{!isBulk && <Text fontWeight="700" mb={5}>{selected?.firstName} {selected?.lastName}</Text>}<Grid gap={4}>
            <FormControl isRequired><FormLabel>Cliente</FormLabel><Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, siteId: '' })}><option value="">Seleccionar</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.tradeName || item.businessName}</option>)}</Select></FormControl>
            <FormControl isRequired><FormLabel>Sede</FormLabel><Select value={form.siteId} isDisabled={!form.clientId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}><option value="">Seleccionar</option>{sites.filter((item) => item.clientId === Number(form.clientId)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormControl>
            <FormControl isRequired><FormLabel>Área</FormLabel><Select value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}><option value="">Seleccionar</option>{areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormControl>
            <FormControl isRequired><FormLabel>Turno</FormLabel><Select value={form.shiftId} onChange={(e) => setForm({ ...form, shiftId: e.target.value })}><option value="">Seleccionar</option>{shifts.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.startTime}-{item.endTime})</option>)}</Select></FormControl>
            <FormControl isRequired><FormLabel>Vigente desde</FormLabel><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></FormControl>
            <FormControl><FormLabel>Observación</FormLabel><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormControl>
          </Grid></ModalBody><ModalFooter><Button variant="ghost" mr={3} onClick={() => setOpen(false)}>Cancelar</Button><Button colorScheme="teal" onClick={save} isLoading={saving}>Confirmar</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} size="3xl">
        <ModalOverlay /><ModalContent><ModalHeader>Historial de asignaciones</ModalHeader><ModalCloseButton />
          <ModalBody pb={6}><Table size="sm"><Thead><Tr><Th>Desde</Th><Th>Hasta</Th><Th>Cliente</Th><Th>Sede</Th><Th>Área</Th><Th>Turno</Th><Th>Asignado por</Th><Th /></Tr></Thead>
            <Tbody>{history.map((item) => <Tr key={item.id}><Td>{String(item.startDate).slice(0, 10)}</Td><Td>{item.endDate ? String(item.endDate).slice(0, 10) : 'Actual'}</Td><Td>{item.clientName}</Td><Td>{item.siteName}</Td><Td>{item.areaName || 'Sin área'}</Td><Td>{item.shiftName}</Td><Td>{item.assignedByName}</Td><Td>{canManage && !item.endDate && <Button size="xs" colorScheme="red" variant="outline" onClick={() => endAssignment(item.id)}>Finalizar</Button>}</Td></Tr>)}</Tbody>
          </Table></ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}
