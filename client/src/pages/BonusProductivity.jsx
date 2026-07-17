import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge, Box, Button, Flex, FormControl, FormLabel, Grid, Heading, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader,
  ModalOverlay, Select, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr,
} from '@chakra-ui/react'
import api from '../services/api'
import { useToast } from '../services/alerts'
import { peruDate } from '../utils/date'

const emptyForm = {
  workDate: peruDate(),
  clientId: '',
  siteId: '',
  areaId: '',
  shiftId: '',
  workTableId: '',
  palletCode: '',
  lotCode: '',
  boxesReceived: 0,
  boxesProcessed: 0,
  unitsTagged: 0,
  unitsRejected: 0,
  startTime: '08:00',
  endTime: '17:00',
  notes: '',
}

const date = (value) => String(value || '').slice(0, 10)
const time = (value) => (value ? new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '')
const hours = (minutes) => {
  const value = Number(minutes || 0)
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}
const scoreAverage = (x) => {
  const values = [x.productivityScore, x.qualityScore, x.teamworkScore, x.disciplineScore].map(Number).filter((v) => !Number.isNaN(v))
  if (!values.length) return ''
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
}

export default function BonusProductivity() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const canManage = ['admin', 'rrhh', 'operaciones'].includes(user?.role)
  const toast = useToast()
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [sites, setSites] = useState([])
  const [areas, setAreas] = useState([])
  const [shifts, setShifts] = useState([])
  const [tables, setTables] = useState([])
  const [filters, setFilters] = useState({ from: peruDate().slice(0, 8) + '01', to: peruDate(), siteId: '', workTableId: '' })
  const [form, setForm] = useState(emptyForm)
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const filteredSites = useMemo(() => sites.filter((x) => !form.clientId || Number(x.clientId) === Number(form.clientId)), [sites, form.clientId])
  const filteredTables = useMemo(() => tables.filter((x) => !form.siteId || Number(x.siteId) === Number(form.siteId)), [tables, form.siteId])
  const filterTables = useMemo(() => tables.filter((x) => !filters.siteId || Number(x.siteId) === Number(filters.siteId)), [tables, filters.siteId])

  const loadCatalogs = () => Promise.all([
    api.get('/organization/clients'),
    api.get('/organization/sites'),
    api.get('/core/areas'),
    api.get('/operational/shifts'),
    api.get('/operational/work-tables'),
  ]).then(([cl, st, ar, sh, wt]) => {
    setClients(cl.data)
    setSites(st.data)
    setAreas(ar.data)
    setShifts(sh.data)
    setTables(wt.data)
  })

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) })
    api.get(`/bonuses/productivity?${params.toString()}`)
      .then((r) => setItems(r.data))
      .catch((e) => toast({ title: 'No se pudo cargar productividad', description: e.response?.data?.error, status: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCatalogs().catch((e) => toast({ title: 'No se pudieron cargar filtros', description: e.response?.data?.error, status: 'error' }))
    load()
  }, [])

  const setField = (key, value) => {
    const next = { ...form, [key]: value }
    if (key === 'clientId') next.siteId = ''
    if (key === 'siteId') next.workTableId = ''
    if (key === 'workTableId') {
      const table = tables.find((x) => Number(x.id) === Number(value))
      if (table) {
        next.clientId = table.clientId
        next.siteId = table.siteId
        next.areaId = table.areaId || ''
      }
    }
    setForm(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/bonuses/productivity', {
        ...form,
        clientId: Number(form.clientId),
        siteId: Number(form.siteId),
        areaId: form.areaId ? Number(form.areaId) : null,
        shiftId: Number(form.shiftId),
        workTableId: Number(form.workTableId),
      })
      toast({ title: 'Productividad registrada', status: 'success' })
      setOpen(false)
      setForm(emptyForm)
      load()
    } catch (e) {
      toast({ title: 'No se pudo guardar', description: e.response?.data?.error, status: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/bonuses/productivity/${id}`)
      setDetail(data)
    } catch (e) {
      toast({ title: 'No se pudo abrir detalle', description: e.response?.data?.error, status: 'error' })
    }
  }

  const saveEvaluation = async (person) => {
    setSaving(true)
    try {
      const payload = {
        productivityScore: person.productivityScore ?? 0,
        qualityScore: person.qualityScore ?? 0,
        teamworkScore: person.teamworkScore ?? 0,
        disciplineScore: person.disciplineScore ?? 0,
        observation: person.observation || '',
      }
      const { data } = await api.put(`/bonuses/productivity/${detail.batch.id}/evaluations/${person.collaboratorId}`, payload)
      setDetail(data)
      toast({ title: 'Evaluacion guardada', status: 'success' })
    } catch (e) {
      toast({ title: 'No se pudo guardar evaluacion', description: e.response?.data?.error, status: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const updatePerson = (collaboratorId, field, value) => {
    setDetail((current) => ({
      ...current,
      people: current.people.map((x) => x.collaboratorId === collaboratorId ? { ...x, [field]: value } : x),
    }))
  }

  return (
    <Box>
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap={4} mb={5}>
        <Box>
          <Heading size="md">Productividad por mesa</Heading>
          <Text color="gray.500" mt={1}>Registra lotes/pallets, unidades etiquetadas y evaluacion individual.</Text>
        </Box>
        {canManage && <Button colorScheme="teal" onClick={() => setOpen(true)}>Nuevo registro</Button>}
      </Flex>

      <Box bg="white" borderWidth="1px" borderRadius="xl" p={5} mb={5}>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(4,1fr)' }} gap={4}>
          <FormControl><FormLabel>Desde</FormLabel><Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></FormControl>
          <FormControl><FormLabel>Hasta</FormLabel><Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></FormControl>
          <FormControl><FormLabel>Sede</FormLabel><Select value={filters.siteId} onChange={(e) => setFilters({ ...filters, siteId: e.target.value, workTableId: '' })}><option value="">Todas</option>{sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></FormControl>
          <FormControl><FormLabel>Mesa</FormLabel><Select value={filters.workTableId} onChange={(e) => setFilters({ ...filters, workTableId: e.target.value })}><option value="">Todas</option>{filterTables.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></FormControl>
        </Grid>
        <Flex justify="flex-end" mt={4}><Button onClick={load} isLoading={loading}>Consultar</Button></Flex>
      </Box>

      <Box className="rrhh-table-scroll" bg="white" borderWidth="1px" borderRadius="xl">
        {loading ? <Flex justify="center" py={12}><Spinner /></Flex> : <Table size="sm">
          <Thead bg="gray.50"><Tr><Th>Fecha</Th><Th>Mesa</Th><Th>Pallet / lote</Th><Th>Cajas</Th><Th>Unidades</Th><Th>Tiempo</Th><Th>Personal</Th><Th>Prod. mesa</Th><Th>Prod. HH</Th><Th>Calidad</Th><Th /></Tr></Thead>
          <Tbody>{items.map((x) => <Tr key={x.id}>
            <Td>{date(x.workDate)}</Td>
            <Td>{x.workTableName}<Text fontSize="xs" color="gray.500">{x.siteName} · {x.shiftName}</Text></Td>
            <Td>{x.palletCode || '-'}<Text fontSize="xs" color="gray.500">{x.lotCode || ''}</Text></Td>
            <Td>{x.boxesProcessed}/{x.boxesReceived}</Td>
            <Td>{x.unitsTagged}<Text fontSize="xs" color="gray.500">Obs: {x.unitsRejected}</Text></Td>
            <Td>{time(x.startedAt)} - {time(x.endedAt)}<Text fontSize="xs" color="gray.500">{hours(x.workedMinutes)} h</Text></Td>
            <Td>{x.peopleCount || 0}</Td>
            <Td>{Number(x.unitsPerHour || 0).toFixed(2)} u/h</Td>
            <Td>{Number(x.unitsPerLaborHour || 0).toFixed(2)} u/hh</Td>
            <Td><Badge colorScheme={Number(x.qualityPercent) >= 95 ? 'green' : 'orange'}>{Number(x.qualityPercent || 0).toFixed(1)}%</Badge></Td>
            <Td><Button size="sm" onClick={() => openDetail(x.id)}>Evaluar</Button></Td>
          </Tr>)}</Tbody>
        </Table>}
      </Box>

      <Modal isOpen={open} onClose={() => setOpen(false)} size="5xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nuevo registro de productividad</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3,1fr)' }} gap={4}>
              <FormControl><FormLabel>Fecha</FormLabel><Input type="date" value={form.workDate} onChange={(e) => setField('workDate', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Mesa</FormLabel><Select value={form.workTableId} onChange={(e) => setField('workTableId', e.target.value)}><option value="">Seleccionar</option>{tables.map((x) => <option key={x.id} value={x.id}>{x.siteName} · {x.name}</option>)}</Select></FormControl>
              <FormControl><FormLabel>Turno</FormLabel><Select value={form.shiftId} onChange={(e) => setField('shiftId', e.target.value)}><option value="">Seleccionar</option>{shifts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></FormControl>
              <FormControl><FormLabel>Cliente</FormLabel><Select value={form.clientId} onChange={(e) => setField('clientId', e.target.value)}><option value="">Seleccionar</option>{clients.map((x) => <option key={x.id} value={x.id}>{x.tradeName || x.businessName}</option>)}</Select></FormControl>
              <FormControl><FormLabel>Sede</FormLabel><Select value={form.siteId} onChange={(e) => setField('siteId', e.target.value)}><option value="">Seleccionar</option>{filteredSites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></FormControl>
              <FormControl><FormLabel>Area</FormLabel><Select value={form.areaId} onChange={(e) => setField('areaId', e.target.value)}><option value="">Sin area</option>{areas.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></FormControl>
              <FormControl><FormLabel>Pallet</FormLabel><Input value={form.palletCode} onChange={(e) => setField('palletCode', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Lote</FormLabel><Input value={form.lotCode} onChange={(e) => setField('lotCode', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Horario</FormLabel><Flex gap={2}><Input type="time" value={form.startTime} onChange={(e) => setField('startTime', e.target.value)} /><Input type="time" value={form.endTime} onChange={(e) => setField('endTime', e.target.value)} /></Flex></FormControl>
              <FormControl><FormLabel>Cajas recibidas</FormLabel><Input type="number" min="0" value={form.boxesReceived} onChange={(e) => setField('boxesReceived', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Cajas procesadas</FormLabel><Input type="number" min="0" value={form.boxesProcessed} onChange={(e) => setField('boxesProcessed', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Unidades etiquetadas</FormLabel><Input type="number" min="0" value={form.unitsTagged} onChange={(e) => setField('unitsTagged', e.target.value)} /></FormControl>
              <FormControl><FormLabel>Unidades observadas</FormLabel><Input type="number" min="0" value={form.unitsRejected} onChange={(e) => setField('unitsRejected', e.target.value)} /></FormControl>
              <FormControl gridColumn={{ md: 'span 2' }}><FormLabel>Observacion</FormLabel><Input value={form.notes} onChange={(e) => setField('notes', e.target.value)} /></FormControl>
            </Grid>
          </ModalBody>
          <ModalFooter><Button variant="ghost" mr={3} onClick={() => setOpen(false)}>Cancelar</Button><Button colorScheme="teal" onClick={save} isLoading={saving}>Guardar</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={Boolean(detail)} onClose={() => setDetail(null)} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Evaluacion individual</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{detail && <>
            <Text mb={4}>{date(detail.batch.workDate)} · {detail.batch.workTableName} · {detail.batch.palletCode || 'Sin pallet'}</Text>
            <Box className="rrhh-table-scroll" borderWidth="1px" borderRadius="xl">
              <Table size="sm">
                <Thead bg="gray.50"><Tr><Th>Trabajador</Th><Th>Productividad</Th><Th>Calidad</Th><Th>Equipo</Th><Th>Disciplina</Th><Th>Prom.</Th><Th>Observacion</Th><Th /></Tr></Thead>
                <Tbody>{detail.people.map((x) => <Tr key={x.collaboratorId}>
                  <Td>{x.lastName}, {x.firstName}<Text fontSize="xs" color="gray.500">{x.documentNumber}</Text></Td>
                  {['productivityScore', 'qualityScore', 'teamworkScore', 'disciplineScore'].map((field) => <Td key={field}><Input w="90px" size="sm" type="number" min="0" max="100" value={x[field] ?? ''} onChange={(e) => updatePerson(x.collaboratorId, field, e.target.value)} /></Td>)}
                  <Td>{scoreAverage(x)}</Td>
                  <Td><Input size="sm" value={x.observation || ''} onChange={(e) => updatePerson(x.collaboratorId, 'observation', e.target.value)} /></Td>
                  <Td>{canManage && <Button size="sm" onClick={() => saveEvaluation(x)} isLoading={saving}>Guardar</Button>}</Td>
                </Tr>)}</Tbody>
              </Table>
            </Box>
          </>}</ModalBody>
          <ModalFooter><Button onClick={() => setDetail(null)}>Cerrar</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}
