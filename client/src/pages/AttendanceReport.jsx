import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge, Box, Button, Flex, FormControl, FormLabel, Grid, Heading, Input,
  Select, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr,
} from '@chakra-ui/react'
import api from '../services/api'
import { useToast } from '../services/alerts'

const statusNames = {
  in_progress: 'En proceso',
  supervisor_closed: 'Cerrado por supervisor',
  rrhh_observed: 'Observado por RRHH',
  rrhh_approved: 'Aprobado por RRHH',
  reopened: 'Reabierto',
  cancelled: 'Cancelado',
}

const validationNames = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  observed: 'Observado',
  annulled: 'Anulado',
  impersonation: 'Posible suplantacion',
}

const pad = (n) => String(n).padStart(2, '0')
const today = new Date()
const todayText = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
const monthStart = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
const emptyFilters = { from: monthStart, to: todayText, clientId: '', siteId: '', areaId: '', shiftId: '', status: '', q: '' }

const dateOnly = (value) => (value ? String(value).slice(0, 10) : '')
const dateTime = (value) => (value ? new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '')
const hours = (minutes) => {
  if (minutes === null || minutes === undefined) return ''
  const value = Number(minutes)
  return `${Math.floor(value / 60)}:${pad(value % 60)}`
}
const sourceName = (value) => ({ qr: 'QR', scanner: 'Lector', manual: 'Manual' }[value] || value || '')
const clean = (value) => String(value ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))

const columns = [
  ['attendanceDate', 'Fecha', (x) => dateOnly(x.attendanceDate)],
  ['clientName', 'Cliente'],
  ['siteName', 'Sede'],
  ['areaName', 'Area'],
  ['shiftName', 'Turno'],
  ['supervisorName', 'Supervisor'],
  ['documentNumber', 'DNI'],
  ['employeeCode', 'Codigo'],
  ['workerName', 'Trabajador', (x) => `${x.lastName || ''}, ${x.firstName || ''}`],
  ['positionName', 'Cargo'],
  ['workTableName', 'Mesa'],
  ['entryAt', 'Ingreso', (x) => dateTime(x.entryAt)],
  ['entrySource', 'Fuente ingreso', (x) => sourceName(x.entrySource)],
  ['exitAt', 'Salida', (x) => dateTime(x.exitAt)],
  ['exitSource', 'Fuente salida', (x) => sourceName(x.exitSource)],
  ['workedMinutes', 'Horas ingreso-salida', (x) => hours(x.workedMinutes)],
  ['extraMinutes', 'Horas extra', (x) => hours(x.extraMinutes)],
  ['minutesLate', 'Min. tardanza', (x) => x.minutesLate ?? 0],
  ['statusName', 'Estado asistencia', (x) => x.statusName || x.statusCode || 'Sin marca'],
  ['supervisorValidation', 'Validacion', (x) => validationNames[x.supervisorValidation] || x.supervisorValidation || 'Pendiente'],
  ['sheetStatus', 'Estado tareo', (x) => statusNames[x.sheetStatus] || x.sheetStatus],
  ['observation', 'Observacion'],
]

export default function AttendanceReport() {
  const [rows, setRows] = useState([])
  const [clients, setClients] = useState([])
  const [sites, setSites] = useState([])
  const [areas, setAreas] = useState([])
  const [shifts, setShifts] = useState([])
  const [filters, setFilters] = useState(emptyFilters)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const availableSites = useMemo(
    () => filters.clientId ? sites.filter((x) => Number(x.clientId) === Number(filters.clientId)) : sites,
    [sites, filters.clientId],
  )

  const loadCatalogs = () => {
    Promise.all([
      api.get('/organization/clients'),
      api.get('/organization/sites'),
      api.get('/core/areas'),
      api.get('/operational/shifts'),
    ])
      .then(([c, s, a, sh]) => {
        setClients(c.data)
        setSites(s.data)
        setAreas(a.data)
        setShifts(sh.data)
      })
      .catch((e) => toast({ title: 'No se pudieron cargar los filtros', description: e.response?.data?.error, status: 'error' }))
  }

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) params.set(key, value)
    })
    api.get(`/attendance/report/general?${params.toString()}`)
      .then((r) => setRows(r.data))
      .catch((e) => toast({ title: 'No se pudo consultar el reporte', description: e.response?.data?.error, status: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCatalogs(); load() }, [])

  const setFilter = (key, value) => {
    const next = { ...filters, [key]: value }
    if (key === 'clientId') next.siteId = ''
    setFilters(next)
  }

  const exportExcel = () => {
    if (!rows.length) {
      toast({ title: 'No hay datos para exportar', status: 'warning' })
      return
    }
    const head = columns.map(([, label]) => `<th>${clean(label)}</th>`).join('')
    const body = rows.map((row) => `<tr>${columns.map(([key, , format]) => `<td>${clean(format ? format(row) : row[key])}</td>`).join('')}</tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `consulta-tareos-${filters.from || 'inicio'}-${filters.to || 'fin'}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Box>
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap={4} mb={7}>
        <Box>
          <Heading size="lg">Consulta general de tareos</Heading>
          <Text color="gray.500" mt={2}>Reporte filtrable para gerencia, administracion y exportacion a Excel.</Text>
        </Box>
        <Button colorScheme="green" onClick={exportExcel} isDisabled={!rows.length}>Exportar Excel</Button>
      </Flex>

      <Box bg="white" borderWidth="1px" borderRadius="xl" p={5} mb={6}>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(4,1fr)' }} gap={4}>
          <FormControl>
            <FormLabel>Desde</FormLabel>
            <Input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Hasta</FormLabel>
            <Input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Cliente</FormLabel>
            <Select value={filters.clientId} onChange={(e) => setFilter('clientId', e.target.value)}>
              <option value="">Todos</option>
              {clients.map((x) => <option key={x.id} value={x.id}>{x.tradeName || x.businessName}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Sede</FormLabel>
            <Select value={filters.siteId} onChange={(e) => setFilter('siteId', e.target.value)}>
              <option value="">Todas</option>
              {availableSites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Area</FormLabel>
            <Select value={filters.areaId} onChange={(e) => setFilter('areaId', e.target.value)}>
              <option value="">Todas</option>
              {areas.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Turno</FormLabel>
            <Select value={filters.shiftId} onChange={(e) => setFilter('shiftId', e.target.value)}>
              <option value="">Todos</option>
              {shifts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Estado tareo</FormLabel>
            <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Buscar</FormLabel>
            <Input value={filters.q} onChange={(e) => setFilter('q', e.target.value)} placeholder="DNI, codigo, trabajador o mesa" />
          </FormControl>
        </Grid>
        <Flex justify="flex-end" gap={3} mt={5}>
          <Button variant="outline" onClick={() => setFilters(emptyFilters)}>Limpiar</Button>
          <Button colorScheme="teal" onClick={load} isLoading={loading}>Consultar</Button>
        </Flex>
      </Box>

      <Flex justify="space-between" align="center" mb={3}>
        <Text color="gray.500">{rows.length} registros encontrados</Text>
        <Text fontSize="sm" color="gray.500">Horas legales: 8h + 1h de almuerzo. Lo excedente se muestra como hora extra.</Text>
      </Flex>

      <Box className="rrhh-table-scroll" bg="white" borderWidth="1px" borderRadius="xl">
        {loading ? <Flex justify="center" py={12}><Spinner /></Flex> : <Table size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th>Fecha</Th><Th>Cliente / sede</Th><Th>Area / turno</Th><Th>Trabajador</Th><Th>Mesa</Th>
              <Th>Ingreso</Th><Th>Salida</Th><Th>Horas</Th><Th>Extra</Th><Th>Tard.</Th><Th>Estado</Th><Th>Tareo</Th>
            </Tr>
          </Thead>
          <Tbody>{rows.map((x, i) => (
            <Tr key={`${x.sheetId}-${x.collaboratorId}-${i}`}>
              <Td>{dateOnly(x.attendanceDate)}</Td>
              <Td>{x.clientName}<Text fontSize="xs" color="gray.500">{x.siteName}</Text></Td>
              <Td>{x.areaName}<Text fontSize="xs" color="gray.500">{x.shiftName}</Text></Td>
              <Td>{x.lastName}, {x.firstName}<Text fontSize="xs" color="gray.500">DNI {x.documentNumber}</Text></Td>
              <Td>{x.workTableName || '-'}</Td>
              <Td>{dateTime(x.entryAt)}<Text fontSize="xs" color="gray.500">{sourceName(x.entrySource)}</Text></Td>
              <Td>{dateTime(x.exitAt)}<Text fontSize="xs" color="gray.500">{sourceName(x.exitSource)}</Text></Td>
              <Td>{hours(x.workedMinutes)}</Td>
              <Td>{hours(x.extraMinutes)}</Td>
              <Td>{x.minutesLate ?? 0}</Td>
              <Td><Badge>{x.statusName || x.statusCode || 'Sin marca'}</Badge></Td>
              <Td><Badge colorScheme={x.sheetStatus === 'rrhh_approved' ? 'green' : x.sheetStatus === 'supervisor_closed' ? 'blue' : 'orange'}>{statusNames[x.sheetStatus] || x.sheetStatus}</Badge></Td>
            </Tr>
          ))}</Tbody>
        </Table>}
      </Box>
    </Box>
  )
}
