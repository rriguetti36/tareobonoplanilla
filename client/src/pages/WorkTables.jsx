import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge, Box, Button, Checkbox, Flex, FormControl, FormLabel, Grid, Heading, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay,
  Select, SimpleGrid, Spinner, Table, Tbody, Td, Text, Textarea, Th, Thead, Tr,
} from '@chakra-ui/react'
import api from '../services/api'
import { useToast } from '../services/alerts'
import CollaboratorAvatar from '../components/CollaboratorAvatar'
import { peruDate } from '../utils/date'

const siteKey = (x) => `${x.clientId}-${x.siteId}`

const StepTitle = ({ number, title, text }) => (
  <Flex gap={3} align="start">
    <Flex bg="teal.500" color="white" borderRadius="full" w="30px" h="30px" align="center" justify="center" fontWeight="800" flexShrink={0}>{number}</Flex>
    <Box>
      <Heading size="sm">{title}</Heading>
      {text && <Text color="gray.500" fontSize="sm" mt={1}>{text}</Text>}
    </Box>
  </Flex>
)

const WorkerCard = ({ worker, selected, disabled, onToggle, onHistory, draggable = true }) => (
  <Flex
    draggable={draggable && !disabled}
    onDragStart={(e) => {
      e.dataTransfer.setData('text/plain', String(worker.assignmentId))
      e.dataTransfer.effectAllowed = 'move'
    }}
    align="center"
    justify="space-between"
    gap={3}
    bg={selected ? 'teal.50' : 'white'}
    borderWidth="1px"
    borderColor={selected ? 'teal.300' : 'gray.200'}
    borderRadius="xl"
    p={3}
    opacity={disabled ? 0.55 : 1}
    cursor={draggable && !disabled ? 'grab' : 'default'}
    _active={{ cursor: draggable && !disabled ? 'grabbing' : 'default' }}
  >
    <Flex align="center" gap={3} minW={0}>
      <Checkbox isDisabled={disabled} isChecked={selected} onChange={onToggle} />
      <CollaboratorAvatar collaborator={{ id: worker.collaboratorId, firstName: worker.firstName, lastName: worker.lastName, photoPath: worker.photoPath }} />
      <Box minW={0}>
        <Text fontWeight="800" noOfLines={1}>{worker.lastName}, {worker.firstName}</Text>
        <Text fontSize="xs" color="gray.500" noOfLines={1}>{worker.documentNumber} · {worker.areaName || 'Sin area'}</Text>
        <Flex gap={2} mt={1} wrap="wrap">
          <Badge colorScheme="purple">{worker.shiftName}</Badge>
          {worker.attendanceStatusCode === 'ABSENT' && <Badge colorScheme="red">Falta</Badge>}
          <Badge colorScheme={worker.workTableName ? 'green' : 'orange'}>{worker.workTableName || 'Sin mesa'}</Badge>
        </Flex>
      </Box>
    </Flex>
    <Button size="xs" variant="ghost" onClick={onHistory}>Mov.</Button>
  </Flex>
)

export default function WorkTables() {
  const toast = useToast()
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  }, [])
  const isSupervisor = currentUser?.role === 'supervisor'
  const [workers, setWorkers] = useState([])
  const [tables, setTables] = useState([])
  const [orgSites, setOrgSites] = useState([])
  const [areas, setAreas] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [workDate, setWorkDate] = useState(peruDate())
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
  const [reportOpen, setReportOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportRows, setReportRows] = useState([])
  const [reportQuery, setReportQuery] = useState('')
  const [dragOverTable, setDragOverTable] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/operational/work-tables/board', { params: { workDate, shiftId: selectedShiftId || undefined } }),
      api.get('/operational/work-tables'),
      api.get('/organization/sites'),
      api.get('/core/areas'),
      api.get('/operational/shifts'),
    ])
      .then(([board, tableData, siteData, areaData, shiftData]) => {
        const boardRows = board.data || []
        const activeSites = siteData.data.filter((x) => x.estado)
        const activeAreas = areaData.data.filter((x) => x.estado)
        const activeShifts = shiftData.data.filter((x) => x.estado)
        let visibleSites = activeSites
        let visibleAreas = activeAreas
        let visibleShifts = activeShifts

        if (isSupervisor) {
          const allowedSiteKeys = new Set(boardRows.map((x) => siteKey(x)))
          const allowedAreaIds = new Set(boardRows.filter((x) => x.areaId).map((x) => String(x.areaId)))
          const allowedShiftIds = new Set(boardRows.filter((x) => x.shiftId).map((x) => String(x.shiftId)))
          visibleSites = activeSites.filter((x) => allowedSiteKeys.has(`${x.clientId}-${x.id}`))
          visibleAreas = allowedAreaIds.size ? activeAreas.filter((x) => allowedAreaIds.has(String(x.id))) : []
          visibleShifts = allowedShiftIds.size ? activeShifts.filter((x) => allowedShiftIds.has(String(x.id))) : []
        }

        setWorkers(boardRows)
        setTables(tableData.data.filter((x) => x.estado))
        setOrgSites(visibleSites)
        setAreas(visibleAreas)
        setShifts(visibleShifts)

        if (isSupervisor) {
          const siteOptions = new Set([...visibleSites.map((x) => `${x.clientId}-${x.id}`), ...boardRows.map((x) => siteKey(x))])
          const nextSite = boardRows[0] ? siteKey(boardRows[0]) : (visibleSites[0] ? `${visibleSites[0].clientId}-${visibleSites[0].id}` : '')
          if (!selectedSite || !siteOptions.has(selectedSite)) setSelectedSite(nextSite)

          const shiftOptions = new Set(visibleShifts.map((x) => String(x.id)))
          const firstBoardShift = boardRows.find((x) => x.shiftId)?.shiftId
          const nextShift = firstBoardShift ? String(firstBoardShift) : (visibleShifts[0] ? String(visibleShifts[0].id) : '')
          if (!selectedShiftId || !shiftOptions.has(String(selectedShiftId))) setSelectedShiftId(nextShift)

          if (selectedAreaId && !visibleAreas.some((x) => String(x.id) === String(selectedAreaId))) setSelectedAreaId('')
        } else {
          if (!selectedShiftId && activeShifts[0]) setSelectedShiftId(String(activeShifts[0].id))
          if (!selectedSite) {
            if (boardRows[0]) setSelectedSite(siteKey(boardRows[0]))
            else if (activeSites[0]) setSelectedSite(`${activeSites[0].clientId}-${activeSites[0].id}`)
          }
        }
      })
      .catch((e) => toast({ title: 'No se pudo cargar mesas de trabajo', description: e.response?.data?.error, status: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])
  useEffect(() => { if (!loading) load() }, [workDate, selectedShiftId])

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
      if (!map.has(key)) map.set(key, { key, clientId: w.clientId, siteId: w.siteId, label: `${w.clientName} / ${w.siteName}` })
    })
    return [...map.values()]
  }, [orgSites, workers, isSupervisor])

  const site = sites.find((x) => x.key === selectedSite)
  const siteWorkers = workers.filter((w) => !selectedSite || siteKey(w) === selectedSite)
  const siteTables = tables.filter((t) => site && t.siteId === site.siteId)
  const selectedTable = siteTables.find((t) => t.id === Number(selectedTableId))
  const filteredWorkers = siteWorkers.filter((w) => {
    const areaOk = !selectedAreaId || w.areaId === Number(selectedAreaId)
    const shiftOk = !selectedShiftId || w.shiftId === Number(selectedShiftId)
    return areaOk && shiftOk
  })
  const tableWorkers = (tableId) => filteredWorkers.filter((w) => w.workTableId === Number(tableId))
  const assignableWorkers = selectedTableId ? filteredWorkers.filter((w) => w.workTableId !== Number(selectedTableId) && w.attendanceStatusCode !== 'ABSENT') : []
  const unassignedWorkers = filteredWorkers.filter((w) => !w.workTableId)
  const assignedCount = filteredWorkers.filter((w) => w.workTableId).length
  const allVisibleSelected = assignableWorkers.length > 0 && assignableWorkers.every((w) => selectedIds.includes(w.assignmentId))

  const changeSite = (value) => {
    setSelectedSite(value)
    setSelectedAreaId('')
    setSelectedTableId('')
    setSelectedIds([])
    setNewTableName('')
    setReason('')
  }

  const changeArea = (value) => { setSelectedAreaId(value); setSelectedIds([]) }
  const chooseTable = (id) => { setSelectedTableId(String(id)); setSelectedIds([]); setReason('') }
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
      toast({ title: 'Mesa creada en la sede', description: 'Ahora arrastra personal hacia esta mesa.', status: 'success' })
    } catch (e) {
      toast({ title: 'No se pudo crear la mesa', description: e.response?.data?.error, status: 'error' })
    } finally { setSaving(false) }
  }

  const saveDailyAssignment = async (assignmentIds, workTableId) => {
    if (!assignmentIds.length || !workDate || !selectedShiftId) {
      toast({ title: 'Selecciona fecha y turno', description: 'La mesa se asigna diariamente por turno.', status: 'warning' })
      return
    }
    setSaving(true)
    try {
      await api.post('/operational/work-tables/assign', {
        assignmentIds,
        workTableId: workTableId ? Number(workTableId) : null,
        workDate,
        shiftId: Number(selectedShiftId),
        reason: reason || 'Asignacion diaria por tablero',
      })
      toast({ title: workTableId ? 'Personal asignado a la mesa' : 'Personal retirado de mesa', description: `${assignmentIds.length} colaborador(es) actualizado(s)`, status: 'success' })
      setSelectedIds([])
      setReason('')
      load()
    } catch (e) {
      toast({ title: 'No se pudo guardar la asignacion', description: e.response?.data?.error || e.message, status: 'error' })
    } finally { setSaving(false) }
  }

  const assignToTable = async () => {
    if (!selectedTableId || !selectedIds.length) return
    await saveDailyAssignment(selectedIds, selectedTableId)
  }

  const onDropToTable = async (event, tableId) => {
    event.preventDefault()
    setDragOverTable('')
    const assignmentId = Number(event.dataTransfer.getData('text/plain'))
    const worker = filteredWorkers.find((x) => x.assignmentId === assignmentId)
    if (!worker || worker.workTableId === Number(tableId) || worker.attendanceStatusCode === 'ABSENT') {
      if (worker?.attendanceStatusCode === 'ABSENT') toast({ title: 'Trabajador con falta', description: 'No se puede mover a mesa personal marcado como falta.', status: 'warning' })
      return
    }
    await saveDailyAssignment([assignmentId], tableId)
  }

  const onDropToUnassigned = async (event) => {
    event.preventDefault()
    setDragOverTable('')
    const assignmentId = Number(event.dataTransfer.getData('text/plain'))
    const worker = filteredWorkers.find((x) => x.assignmentId === assignmentId)
    if (!worker || !worker.workTableId) return
    await saveDailyAssignment([assignmentId], null)
  }

  const openHistoricalReport = async () => {
    if (!workDate) return
    setReportOpen(true)
    setReportLoading(true)
    try {
      const params = {
        from: workDate,
        to: workDate,
        shiftId: selectedShiftId || undefined,
        siteId: site?.siteId || undefined,
        q: reportQuery || undefined,
      }
      const { data } = await api.get('/operational/work-tables/history', { params })
      setReportRows(data)
    } catch (e) {
      toast({ title: 'No se pudo cargar el reporte historico', description: e.response?.data?.error || e.message, status: 'error' })
    } finally {
      setReportLoading(false)
    }
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
      <Flex direction={{ base: 'column', lg: 'row' }} justify="space-between" gap={5} mb={7}>
        <Box>
          <Heading size="lg">Mesas de trabajo</Heading>
          <Text color="gray.500" mt={2}>{isSupervisor ? 'Tablero diario segun tu sede y turno asignado: arrastra cada trabajador a su mesa.' : 'Tablero diario: filtra sede y turno, luego arrastra cada trabajador a su mesa.'}</Text>
        </Box>
        <Button colorScheme="blue" variant="outline" onClick={openHistoricalReport}>Reporte historico</Button>
        {site && <Flex gap={3} wrap="wrap">
          <Badge colorScheme="blue" px={3} py={2}>{siteTables.length} mesas</Badge>
          <Badge colorScheme="green" px={3} py={2}>{filteredWorkers.length} personas del turno</Badge>
          <Badge colorScheme={unassignedWorkers.length ? 'orange' : 'gray'} px={3} py={2}>{unassignedWorkers.length} sin mesa</Badge>
          <Badge colorScheme="teal" px={3} py={2}>{assignedCount} asignados</Badge>
        </Flex>}
      </Flex>

      <Box bg="white" borderWidth="1px" borderRadius="xl" p={5} mb={5}>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
          <FormControl>
            <FormLabel>Fecha de trabajo</FormLabel>
            <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Turno</FormLabel>
            <Select value={selectedShiftId} isDisabled={isSupervisor} onChange={(e) => { setSelectedShiftId(e.target.value); setSelectedIds([]); setSelectedTableId('') }}>
              <option value="">{isSupervisor ? 'Turno asignado' : 'Seleccionar turno'}</option>
              {shifts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Sede</FormLabel>
            <Select value={selectedSite} isDisabled={isSupervisor} onChange={(e) => changeSite(e.target.value)}>
              <option value="">{isSupervisor ? 'Sede asignada' : 'Seleccionar sede'}</option>
              {sites.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Area</FormLabel>
            <Select value={selectedAreaId} isDisabled={isSupervisor && areas.length <= 1} onChange={(e) => changeArea(e.target.value)}>
              <option value="">{isSupervisor ? 'Areas de mi asignacion' : 'Todas las areas'}</option>
              {areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </FormControl>
        </Grid>
      </Box>

      <Grid templateColumns={{ base: '1fr', xl: '320px minmax(420px, 1fr) 360px' }} gap={5} alignItems="start">
        <Grid gap={5} position={{ xl: 'sticky' }} top={{ xl: 4 }}>
          <Box bg="white" borderWidth="1px" borderRadius="xl" p={5}>
            <StepTitle number="1" title="Crear mesa" text="La mesa pertenece a la sede y puede usarse en cualquier turno." />
            <Grid gap={3} mt={4}>
              <Input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="Nombre de la mesa" />
              <Button colorScheme="teal" onClick={createTable} isLoading={saving} isDisabled={!site || !newTableName.trim()}>
                Crear mesa
              </Button>
            </Grid>
          </Box>

          <Box
            bg="orange.50"
            borderWidth="1px"
            borderColor={dragOverTable === 'unassigned' ? 'orange.400' : 'orange.200'}
            borderRadius="xl"
            p={5}
            onDragOver={(e) => { e.preventDefault(); setDragOverTable('unassigned') }}
            onDragLeave={() => setDragOverTable('')}
            onDrop={onDropToUnassigned}
          >
            <StepTitle number="2" title="Sin mesa" text="Arrastra aqui a alguien si quieres retirarlo de una mesa para este dia/turno." />
            <Text mt={4} color="orange.700" fontWeight="800">{unassignedWorkers.length} trabajador(es)</Text>
          </Box>

          <Box bg="white" borderWidth="1px" borderRadius="xl" p={5}>
            <StepTitle number="3" title="Seleccion multiple" text="Para mover varios trabajadores, marca y confirma en una mesa." />
            <FormControl mt={4}>
              <FormLabel>Motivo / criterio</FormLabel>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. Cubrir espacio libre, avance de pallet..." minH="72px" />
            </FormControl>
            <Button mt={4} w="full" colorScheme="teal" isDisabled={!selectedTable || !selectedIds.length} isLoading={saving} onClick={assignToTable}>
              Asignar a {selectedTable?.name || 'mesa'} ({selectedIds.length})
            </Button>
          </Box>
        </Grid>

        <Grid gap={5}>
          <SimpleGrid columns={{ base: 1, '2xl': 2 }} spacing={4}>
            {siteTables.map((table) => {
              const people = tableWorkers(table.id)
              const active = Number(selectedTableId) === table.id
              const over = dragOverTable === String(table.id)
              return (
                <Box
                  key={table.id}
                  bg={active ? 'teal.50' : 'white'}
                  borderWidth="2px"
                  borderColor={over ? 'teal.400' : active ? 'teal.300' : 'gray.200'}
                  borderRadius="2xl"
                  p={4}
                  minH="260px"
                  onClick={() => chooseTable(table.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverTable(String(table.id)) }}
                  onDragLeave={() => setDragOverTable('')}
                  onDrop={(e) => onDropToTable(e, table.id)}
                >
                  <Flex justify="space-between" gap={3} align="start" mb={3}>
                    <Box>
                      <Text fontWeight="900" fontSize="lg">{table.name}</Text>
                      <Text fontSize="xs" color="gray.500">Suelta trabajadores aqui</Text>
                    </Box>
                    <Badge colorScheme={people.length ? 'green' : 'orange'} px={3} py={1}>{people.length}</Badge>
                  </Flex>
                  <Grid gap={3} maxH="360px" overflowY="auto" pr={1}>
                    {people.map((w) => {
                      const isAbsent = w.attendanceStatusCode === 'ABSENT'
                      return <WorkerCard key={w.assignmentId} worker={w} selected={selectedIds.includes(w.assignmentId)} disabled={isAbsent} onToggle={() => toggleOne(w.assignmentId)} onHistory={() => showHistory(w)} />
                    })}
                    {!people.length && <Flex minH="120px" align="center" justify="center" borderWidth="1px" borderStyle="dashed" borderRadius="xl" color="gray.500" textAlign="center" px={4}>Arrastra personal a esta mesa</Flex>}
                  </Grid>
                </Box>
              )
            })}
            {!siteTables.length && <Box bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="xl" p={5}><Text color="orange.700">Todavia no hay mesas en esta sede. Crea la primera desde el panel izquierdo.</Text></Box>}
          </SimpleGrid>
        </Grid>

        <Box bg="white" borderWidth="1px" borderRadius="xl" p={5} position={{ xl: 'sticky' }} top={{ xl: 4 }} maxH={{ xl: 'calc(100vh - 32px)' }} overflowY={{ xl: 'auto' }}>
          <Flex direction="column" gap={4} mb={4}>
            <Box>
              <Heading size="md">Personal disponible</Heading>
              <Text color="gray.500" fontSize="sm">Arrastra una ficha hacia una mesa o marca varios trabajadores para asignarlos en bloque.</Text>
            </Box>
            <Flex gap={3} align="center" wrap="wrap">
              <Checkbox isDisabled={!selectedTable || !assignableWorkers.length} isChecked={allVisibleSelected} isIndeterminate={selectedIds.length > 0 && !allVisibleSelected} onChange={toggleAll}>Marcar disponibles</Checkbox>
              <Badge colorScheme="blue" px={3} py={2}>{selectedIds.length} seleccionados</Badge>
            </Flex>
          </Flex>
          <Grid gap={3}>
            {filteredWorkers.map((w) => {
              const canSelect = selectedTable && w.workTableId !== Number(selectedTableId)
              const isAbsent = w.attendanceStatusCode === 'ABSENT'
              return <WorkerCard key={w.assignmentId} worker={w} selected={selectedIds.includes(w.assignmentId)} disabled={!canSelect || isAbsent} onToggle={() => toggleOne(w.assignmentId)} onHistory={() => showHistory(w)} />
            })}
            {!filteredWorkers.length && <Box bg="gray.50" borderRadius="xl" p={5}><Text color="gray.500">No hay personal asignado a esta sede/turno con los filtros actuales.</Text></Box>}
          </Grid>
        </Box>
      </Grid>

      <Modal isOpen={reportOpen} onClose={() => setReportOpen(false)} size="6xl">
        <ModalOverlay /><ModalContent><ModalHeader>Reporte historico de mesas</ModalHeader><ModalCloseButton />
          <ModalBody pb={6}>
            <Grid templateColumns={{ base: '1fr', md: '1fr auto' }} gap={3} mb={4}>
              <Input value={reportQuery} onChange={(e) => setReportQuery(e.target.value)} placeholder="Buscar DNI, codigo, trabajador o mesa" />
              <Button onClick={openHistoricalReport} isLoading={reportLoading} colorScheme="blue">Consultar</Button>
            </Grid>
            <Box className="rrhh-table-scroll">
              <Table size="sm">
                <Thead><Tr><Th>Fecha</Th><Th>Sede</Th><Th>Area</Th><Th>Turno</Th><Th>Mesa</Th><Th>Trabajador</Th><Th>DNI</Th><Th>Estado tareo</Th><Th>Asignado por</Th><Th>Hora</Th><Th>Motivo</Th></Tr></Thead>
                <Tbody>
                  {reportRows.map((item) => <Tr key={item.id}>
                    <Td>{item.workDate ? String(item.workDate).slice(0, 10) : '-'}</Td>
                    <Td>{item.siteName}</Td>
                    <Td>{item.areaName || '-'}</Td>
                    <Td>{item.shiftName}</Td>
                    <Td>{item.workTableName || 'Sin mesa'}</Td>
                    <Td>{item.lastName}, {item.firstName}</Td>
                    <Td>{item.documentNumber}</Td>
                    <Td><Badge colorScheme={item.attendanceStatusCode === 'ABSENT' ? 'red' : 'green'}>{item.attendanceStatusName || '-'}</Badge></Td>
                    <Td>{item.assignedByName}</Td>
                    <Td>{item.assignedAt ? new Date(item.assignedAt).toLocaleString() : '-'}</Td>
                    <Td>{item.reason || '-'}</Td>
                  </Tr>)}
                  {!reportLoading && !reportRows.length && <Tr><Td colSpan={11}><Text color="gray.500">No hay asignaciones historicas con los filtros actuales.</Text></Td></Tr>}
                  {reportLoading && <Tr><Td colSpan={11}><Text color="gray.500">Cargando reporte...</Text></Td></Tr>}
                </Tbody>
              </Table>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} size="3xl">
        <ModalOverlay /><ModalContent><ModalHeader>Movimientos de mesa - {historyPerson?.lastName}, {historyPerson?.firstName}</ModalHeader><ModalCloseButton />
          <ModalBody pb={6}>
            <Box className="rrhh-table-scroll">
              <Table size="sm"><Thead><Tr><Th>Fecha/hora</Th><Th>Dia</Th><Th>Turno</Th><Th>Desde</Th><Th>Hacia</Th><Th>Movido por</Th><Th>Motivo</Th></Tr></Thead>
                <Tbody>{history.map((item) => <Tr key={item.id}><Td>{new Date(item.movedAt).toLocaleString()}</Td><Td>{item.workDate ? String(item.workDate).slice(0, 10) : '-'}</Td><Td>{item.shiftName || '-'}</Td><Td>{item.previousWorkTableName || 'Sin mesa'}</Td><Td>{item.newWorkTableName || 'Sin mesa'}</Td><Td>{item.movedByName}</Td><Td>{item.reason || '-'}</Td></Tr>)}</Tbody>
              </Table>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}
