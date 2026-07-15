import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge, Box, Button, Checkbox, Flex, FormControl, FormLabel, Grid, Heading, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay,
  Select, SimpleGrid, Spinner, Table, Tbody, Td, Text, Textarea, Th, Thead, Tr,
} from '@chakra-ui/react'
import api from '../services/api'
import { useToast } from '../services/alerts'
import CollaboratorAvatar from '../components/CollaboratorAvatar'

const siteKey = (x) => `${x.clientId}-${x.siteId}`

export default function WorkTables() {
  const toast = useToast()
  const [workers, setWorkers] = useState([])
  const [tables, setTables] = useState([])
  const [orgSites, setOrgSites] = useState([])
  const [areas, setAreas] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSite, setSelectedSite] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [selectedShiftId, setSelectedShiftId] = useState('')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [newTableName, setNewTableName] = useState('')
  const [reason, setReason] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [historyPerson, setHistoryPerson] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/operational/work-tables/board'),
      api.get('/operational/work-tables'),
      api.get('/organization/sites'),
      api.get('/core/areas'),
      api.get('/operational/shifts'),
    ])
      .then(([board, tableData, siteData, areaData, shiftData]) => {
        const activeSites = siteData.data.filter((x) => x.estado)
        setWorkers(board.data)
        setTables(tableData.data.filter((x) => x.estado))
        setOrgSites(activeSites)
        setAreas(areaData.data.filter((x) => x.estado))
        setShifts(shiftData.data.filter((x) => x.estado))
        if (!selectedSite) {
          if (board.data[0]) setSelectedSite(siteKey(board.data[0]))
          else if (activeSites[0]) setSelectedSite(`${activeSites[0].clientId}-${activeSites[0].id}`)
        }
      })
      .catch((e) => toast({ title: 'No se pudo cargar mesas de trabajo', description: e.response?.data?.error, status: 'error' }))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const sites = useMemo(() => {
    const map = new Map()
    orgSites.forEach((site) => {
      map.set(`${site.clientId}-${site.id}`, {
        key: `${site.clientId}-${site.id}`,
        clientId: site.clientId,
        siteId: site.id,
        label: `${site.clientName} / ${site.name}`,
      })
    })
    workers.forEach((w) => {
      const key = siteKey(w)
      if (!map.has(key)) {
        map.set(key, {
          key,
          clientId: w.clientId,
          siteId: w.siteId,
          label: `${w.clientName} / ${w.siteName}`,
        })
      }
    })
    return [...map.values()]
  }, [orgSites, workers])

  const site = sites.find((x) => x.key === selectedSite)
  const siteWorkers = workers.filter((w) => !selectedSite || siteKey(w) === selectedSite)
  const filteredWorkers = siteWorkers.filter((w) => {
    const areaOk = !selectedAreaId || w.areaId === Number(selectedAreaId)
    const shiftOk = !selectedShiftId || w.shiftId === Number(selectedShiftId)
    return areaOk && shiftOk
  })
  const siteTables = tables.filter((t) => site && t.siteId === site.siteId)
  const selectedTable = siteTables.find((t) => t.id === Number(selectedTableId))
  const tableWorkers = filteredWorkers.filter((w) => w.workTableId === Number(selectedTableId))
  const assignableWorkers = selectedTableId ? filteredWorkers.filter((w) => w.workTableId !== Number(selectedTableId)) : []
  const allVisibleSelected = assignableWorkers.length > 0 && assignableWorkers.every((w) => selectedIds.includes(w.assignmentId))

  const changeSite = (value) => {
    setSelectedSite(value)
    setSelectedAreaId('')
    setSelectedShiftId('')
    setSelectedTableId('')
    setSelectedIds([])
    setNewTableName('')
    setReason('')
  }

  const changeArea = (value) => {
    setSelectedAreaId(value)
    setSelectedIds([])
  }

  const changeShift = (value) => {
    setSelectedShiftId(value)
    setSelectedIds([])
  }

  const toggleAll = () => setSelectedIds(allVisibleSelected ? [] : assignableWorkers.map((w) => w.assignmentId))
  const toggleOne = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id])

  const createTable = async () => {
    const name = newTableName.trim()
    if (!site || !name) return
    setSaving(true)
    try {
      const { data } = await api.post('/operational/work-tables', {
        clientId: site.clientId,
        siteId: site.siteId,
        areaId: null,
        name,
      })
      setTables((current) => [...current, data])
      setSelectedTableId(String(data.id))
      setNewTableName('')
      toast({ title: 'Mesa creada en la sede', status: 'success' })
    } catch (e) {
      toast({ title: 'No se pudo crear la mesa', description: e.response?.data?.error, status: 'error' })
    } finally { setSaving(false) }
  }

  const assignToTable = async () => {
    if (!selectedTableId || !selectedIds.length) return
    setSaving(true)
    try {
      await api.post('/operational/work-tables/assign', { assignmentIds: selectedIds, workTableId: Number(selectedTableId), reason })
      toast({ title: 'Personal asignado a la mesa', description: `${selectedIds.length} colaborador(es) actualizado(s)`, status: 'success' })
      setSelectedIds([])
      setReason('')
      load()
    } catch (e) {
      toast({ title: 'No se pudo asignar personal', description: e.response?.data?.error || e.message, status: 'error' })
    } finally { setSaving(false) }
  }

  const showHistory = async (person) => {
    setHistoryPerson(person)
    const { data } = await api.get(`/operational/work-tables/movements/${person.collaboratorId}`)
    setHistory(data)
    setHistoryOpen(true)
  }

  if (loading) return <Flex justify="center" py={16}><Spinner /></Flex>

  return (
    <Box>
      <Flex justify="space-between" align="start" gap={4} mb={7}>
        <Box>
          <Heading size="lg">Mesas de trabajo</Heading>
          <Text color="gray.500" mt={2}>
            La mesa es fisica y pertenece a una sede. Puede ser usada por varios turnos: manana, tarde o noche.
          </Text>
        </Box>
      </Flex>

      <Box bg="white" borderWidth="1px" borderRadius="xl" p={5} mb={5}>
        <Heading size="md" mb={4}>1. Crear mesa en una sede</Heading>
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr auto' }} gap={4} alignItems="end">
          <FormControl>
            <FormLabel>Sede</FormLabel>
            <Select value={selectedSite} onChange={(e) => changeSite(e.target.value)}>
              <option value="">Seleccionar sede</option>
              {sites.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Nombre de la mesa</FormLabel>
            <Input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="Ej. Mesa 01" />
          </FormControl>
          <Button colorScheme="teal" onClick={createTable} isLoading={saving} isDisabled={!site || !newTableName.trim()}>
            Crear mesa
          </Button>
        </Grid>
      </Box>

      {site && <Box bg="white" borderWidth="1px" borderRadius="xl" p={5} mb={5}>
        <Heading size="md" mb={4}>2. Mesas creadas en la sede</Heading>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
          {siteTables.map((table) => {
            const count = siteWorkers.filter((w) => w.workTableId === table.id).length
            const active = Number(selectedTableId) === table.id
            return (
              <Box key={table.id} bg={active ? 'teal.50' : 'white'} borderWidth="1px" borderColor={active ? 'teal.300' : 'gray.200'} borderRadius="xl" p={5} cursor="pointer" onClick={() => { setSelectedTableId(String(table.id)); setSelectedIds([]) }}>
                <Flex justify="space-between" gap={3}>
                  <Box>
                    <Heading size="sm">{table.name}</Heading>
                    <Text fontSize="sm" color="gray.500" mt={1}>{table.siteName}</Text>
                  </Box>
                  <Badge colorScheme={count ? 'green' : 'orange'} h="fit-content">{count} persona{count === 1 ? '' : 's'}</Badge>
                </Flex>
              </Box>
            )
          })}
          {!siteTables.length && <Box bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="xl" p={5}><Text color="orange.700">Aun no hay mesas creadas para esta sede. Crea la primera arriba.</Text></Box>}
        </SimpleGrid>

        {selectedTable && <Box className="rrhh-table-scroll" borderWidth="1px" borderRadius="xl" mt={5}>
          <Table>
            <Thead bg="gray.50"><Tr><Th colSpan={6}>Trabajadores de {selectedTable.name}</Th></Tr></Thead>
            <Tbody>{tableWorkers.map((w) => (
              <Tr key={w.assignmentId}>
                <Td><CollaboratorAvatar collaborator={{ id: w.collaboratorId, firstName: w.firstName, lastName: w.lastName, photoPath: w.photoPath }} /></Td>
                <Td fontWeight="700">{w.lastName}, {w.firstName}<Text fontSize="xs" color="gray.500">{w.employeeCode}</Text></Td>
                <Td>{w.documentNumber}</Td>
                <Td>{w.areaName}</Td>
                <Td>{w.shiftName}</Td>
                <Td><Button size="sm" variant="ghost" onClick={() => showHistory(w)}>Movimientos</Button></Td>
              </Tr>
            ))}
            {!tableWorkers.length && <Tr><Td colSpan={6}><Text color="gray.500">Esta mesa no tiene personal asignado con los filtros actuales.</Text></Td></Tr>}
            </Tbody>
          </Table>
        </Box>}
      </Box>}

      {site && <Box bg="white" borderWidth="1px" borderRadius="xl" p={5} mb={5}>
        <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap={4}>
          <Box>
            <Heading size="md">3. Personal asignado a la sede</Heading>
            <Text color="gray.500" mt={1}>Filtra por area o turno si necesitas mover solo un grupo. Si no filtras, veras todos los turnos de la sede.</Text>
          </Box>
          {selectedTable && <Button colorScheme="teal" isDisabled={!selectedIds.length} isLoading={saving} onClick={assignToTable}>
            Asignar a {selectedTable.name} ({selectedIds.length})
          </Button>}
        </Flex>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} mt={4}>
          <FormControl>
            <FormLabel>Area</FormLabel>
            <Select value={selectedAreaId} onChange={(e) => changeArea(e.target.value)}>
              <option value="">Todas las areas</option>
              {areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Turno</FormLabel>
            <Select value={selectedShiftId} onChange={(e) => changeShift(e.target.value)}>
              <option value="">Todos los turnos</option>
              {shifts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Motivo / criterio del supervisor</FormLabel>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. Cubrir espacio libre, cambio por avance de pallet..." />
          </FormControl>
        </Grid>
      </Box>}

      {site && <Box className="rrhh-table-scroll" bg="white" borderWidth="1px" borderRadius="xl">
        <Table>
          <Thead bg="gray.50"><Tr>{selectedTable && <Th><Checkbox isChecked={allVisibleSelected} isIndeterminate={selectedIds.length > 0 && !allVisibleSelected} onChange={toggleAll} /></Th>}<Th>Personal de la sede</Th><Th>Documento</Th><Th>Area</Th><Th>Turno</Th><Th>Mesa actual</Th><Th /></Tr></Thead>
          <Tbody>{filteredWorkers.map((w) => {
            const canSelect = selectedTable && w.workTableId !== Number(selectedTableId)
            return (
              <Tr key={w.assignmentId}>
                {selectedTable && <Td><Checkbox isDisabled={!canSelect} isChecked={selectedIds.includes(w.assignmentId)} onChange={() => toggleOne(w.assignmentId)} /></Td>}
                <Td><Flex align="center" gap={3}><CollaboratorAvatar collaborator={{ id: w.collaboratorId, firstName: w.firstName, lastName: w.lastName, photoPath: w.photoPath }} /><Box><Text fontWeight="700">{w.lastName}, {w.firstName}</Text><Text fontSize="xs" color="gray.500">{w.employeeCode}</Text></Box></Flex></Td>
                <Td>{w.documentNumber}</Td>
                <Td>{w.areaName}</Td>
                <Td>{w.shiftName}</Td>
                <Td><Badge colorScheme={w.workTableName ? 'green' : 'orange'}>{w.workTableName || 'Sin mesa'}</Badge></Td>
                <Td><Button size="sm" variant="ghost" onClick={() => showHistory(w)}>Movimientos</Button></Td>
              </Tr>
            )
          })}
          {!filteredWorkers.length && <Tr><Td colSpan={selectedTable ? 7 : 6}><Text color="gray.500">No hay personal asignado a esta sede con los filtros actuales.</Text></Td></Tr>}
          </Tbody>
        </Table>
      </Box>}

      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} size="3xl">
        <ModalOverlay /><ModalContent><ModalHeader>Movimientos de mesa - {historyPerson?.lastName}, {historyPerson?.firstName}</ModalHeader><ModalCloseButton />
          <ModalBody pb={6}>
            <Table size="sm"><Thead><Tr><Th>Fecha/hora</Th><Th>Desde</Th><Th>Hacia</Th><Th>Movido por</Th><Th>Motivo</Th></Tr></Thead>
              <Tbody>{history.map((item) => <Tr key={item.id}><Td>{new Date(item.movedAt).toLocaleString()}</Td><Td>{item.previousWorkTableName || 'Sin mesa'}</Td><Td>{item.newWorkTableName || 'Sin mesa'}</Td><Td>{item.movedByName}</Td><Td>{item.reason || '-'}</Td></Tr>)}</Tbody>
            </Table>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}
