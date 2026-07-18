import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, AlertIcon, Badge, Box, Button, Flex, FormControl, FormLabel, Grid, Heading,
  Input, Select, Spinner, Stat, StatLabel, StatNumber, Table, Tbody, Td, Text, Th, Thead, Tr,
} from '@chakra-ui/react'
import api from '../services/api'
import { useToast } from '../services/alerts'
import { peruTime } from '../utils/date'
import QrCameraScanner from '../components/QrCameraScanner'

const statusNames = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  reopened: 'Reabierto',
  supervisor_closed: 'Cerrado',
  rrhh_approved: 'Aprobado',
}

const markNames = { entry: 'Ingreso', exit: 'Salida', presence: 'Presencia' }

const normalizeCode = (value) => String(value || '').trim().replace(/\s+/g, '').toUpperCase()
const candidateCodes = (value) => {
  const raw = String(value || '').trim()
  const normalized = normalizeCode(raw)
  const digitRuns = raw.match(/\d{8,}/g) || []
  const windows = []
  digitRuns.forEach((run) => {
    windows.push(run, run.slice(0, 8))
    for (let index = 0; index <= run.length - 8; index += 1) windows.push(run.slice(index, index + 8))
  })
  return [...new Set([normalized, ...windows.map(normalizeCode)]).filter(Boolean)]
}
const safeTime = (value) => {
  if (!value) return 'Pendiente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Pendiente'
  return peruTime(value)
}

const NotFoundStatus = ({ code, onNext }) => (
  <Box bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="2xl" p={{ base: 4, md: 6 }}>
    <Flex justify="space-between" gap={4} wrap="wrap" align="start">
      <Box>
        <Text color="red.700" fontSize="sm" fontWeight="800">DNI / Fotocheck no encontrado</Text>
        <Heading size="md" mt={1}>{code || 'Lectura sin código'}</Heading>
        <Text color="gray.600" mt={2}>La lectura no pertenece al tareo abierto o el código del documento trae un formato distinto.</Text>
      </Box>
      <Button colorScheme="red" variant="outline" onClick={onNext}>Continuar con el siguiente</Button>
    </Flex>
  </Box>
)

const PersonStatus = ({ person, markingType }) => {
  if (!person) return null
  const duplicate = markingType === 'entry' ? person.entryAt : markingType === 'exit' ? person.exitAt : false
  return (
    <Box bg={duplicate ? 'orange.50' : 'green.50'} borderWidth="1px" borderColor={duplicate ? 'orange.200' : 'green.200'} borderRadius="2xl" p={{ base: 4, md: 6 }}>
      <Flex justify="space-between" gap={4} wrap="wrap" align="start">
        <Box>
          <Text color="gray.500" fontSize="sm">Trabajador detectado</Text>
          <Heading size="lg" mt={1}>{person.lastName}, {person.firstName}</Heading>
          <Text color="gray.600" mt={2}>{person.documentNumber} · {person.employeeCode}</Text>
          <Flex gap={2} mt={3} wrap="wrap">
            <Badge colorScheme="purple">{person.positionName || 'Sin cargo'}</Badge>
            {person.workTableName && <Badge colorScheme="teal">{person.workTableName}</Badge>}
            <Badge colorScheme={person.statusCode === 'LATE' ? 'orange' : person.statusCode ? 'green' : 'gray'}>{person.statusName || 'Sin marca'}</Badge>
          </Flex>
        </Box>
        <Badge colorScheme={duplicate ? 'orange' : 'green'} px={3} py={2}>{duplicate ? 'Ya tiene marca' : 'Listo para confirmar'}</Badge>
      </Flex>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3} mt={5}>
        <Box bg="white" borderRadius="xl" p={4}><Text fontSize="xs" color="gray.500">Ingreso</Text><Text fontWeight="800">{safeTime(person.entryAt)}</Text></Box>
        <Box bg="white" borderRadius="xl" p={4}><Text fontSize="xs" color="gray.500">Salida</Text><Text fontWeight="800">{safeTime(person.exitAt)}</Text></Box>
        <Box bg="white" borderRadius="xl" p={4}><Text fontSize="xs" color="gray.500">Marcación a registrar</Text><Text fontWeight="800">{markNames[markingType]}</Text></Box>
      </Grid>
      {duplicate && <Alert status="warning" borderRadius="xl" mt={4}><AlertIcon />Marcación duplicada. El sistema conserva la primera lectura.</Alert>}
    </Box>
  )
}

export default function AttendanceScanner() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selected, setSelected] = useState(null)
  const [markingType, setMarkingType] = useState('entry')
  const [mode, setMode] = useState('laser')
  const [code, setCode] = useState('')
  const [candidate, setCandidate] = useState(null)
  const [notFoundCode, setNotFoundCode] = useState('')
  const [message, setMessage] = useState('')
  const [scanning, setScanning] = useState(false)
  const inputRef = useRef(null)

  const activeSheets = useMemo(() => items.filter((x) => ['in_progress', 'reopened'].includes(x.status)), [items])
  const people = selected?.people || []
  const detectedDuplicate = candidate && (markingType === 'entry' ? candidate.entryAt : markingType === 'exit' ? candidate.exitAt : false)
  const canConfirm = Boolean(selected?.sheet?.id && candidate && !detectedDuplicate && !saving)

  const resetForNext = () => {
    setCandidate(null)
    setNotFoundCode('')
    setMessage('')
    setCode('')
    setScanning(false)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/attendance')
      setItems(data)
      const firstOpen = data.find((x) => ['in_progress', 'reopened'].includes(x.status))
      if (firstOpen && !selectedId) {
        setSelectedId(String(firstOpen.id))
        await openSheet(firstOpen.id)
      }
    } catch (e) {
      toast({ title: 'No se pudo cargar tareos abiertos', description: e.response?.data?.error || e.message, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const openSheet = async (id) => {
    if (!id) { setSelected(null); return }
    try {
      const { data } = await api.get(`/attendance/${id}`)
      setSelected(data)
      resetForNext()
    } catch (e) {
      toast({ title: 'No se pudo abrir el tareo', description: e.response?.data?.error || e.message, status: 'error' })
    }
  }

  useEffect(() => { load() }, [])

  const previewCode = (value, detectedMode = mode) => {
    try {
      const clean = normalizeCode(value)
      if (!clean) return
      const possibleCodes = candidateCodes(value)
      let matchedCode = possibleCodes[0] || clean
      const person = people.find((p) => {
        const documentNumber = normalizeCode(p.documentNumber)
        const employeeCode = normalizeCode(p.employeeCode)
        const matched = possibleCodes.find((item) => item === documentNumber || item === employeeCode || item.includes(documentNumber) || item.includes(employeeCode))
        if (matched) matchedCode = documentNumber || employeeCode || matched
        return Boolean(matched)
      })
      setCode(matchedCode)
      setScanning(false)
      setCandidate(person || null)
      setNotFoundCode(person ? '' : clean)
      if (!person) {
        setMessage('No se encontró este DNI/fotocheck dentro del tareo seleccionado.')
        toast({ title: 'Lectura no encontrada', description: 'Verifica que el trabajador pertenezca al tareo abierto.', status: 'warning' })
        return
      }
      setMessage(detectedMode === 'mobile' ? 'Lectura por cámara móvil detectada. Revisa y confirma.' : 'Lectura por pistola detectada. Revisa y confirma.')
    } catch (error) {
      setCandidate(null)
      setNotFoundCode(String(value || ''))
      setMessage('No se pudo interpretar la lectura. Intenta nuevamente.')
      toast({ title: 'Lectura no interpretada', description: error.message, status: 'error' })
    }
  }
  useEffect(() => {
    if (mode !== 'laser' || code.trim().length < 8) return undefined
    const timer = setTimeout(() => previewCode(code, 'laser'), 180)
    return () => clearTimeout(timer)
  }, [code, mode])

  const confirmMark = async () => {
    if (!canConfirm) return
    setSaving(true)
    try {
      const deviceInfo = mode === 'mobile' ? `mobile-camera | ${navigator.userAgent}` : 'laser-scanner'
      const cleanCode = normalizeCode(candidate.documentNumber || code)
      await api.post(`/attendance/${selected.sheet.id}/scan-code`, { code: cleanCode, rawCode: code, markingType, deviceInfo })
      toast({ title: 'Marcación registrada', description: `${markNames[markingType]} de ${candidate.lastName}, ${candidate.firstName}`, status: 'success' })
      const sheetId = selected.sheet.id
      await openSheet(sheetId)
      resetForNext()
    } catch (e) {
      toast({ title: 'No se pudo registrar', description: e.response?.data?.error || e.message, status: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Flex justify="center" py={16}><Spinner /></Flex>

  return (
    <Box>
      <Flex direction={{ base: 'column', lg: 'row' }} justify="space-between" gap={5} mb={7}>
        <Box>
          <Heading size="lg">Escaneo de asistencia</Heading>
          <Text color="gray.500" mt={2}>Usa pistola lectora o cámara del móvil. Primero se visualiza el trabajador y luego confirmas la marcación.</Text>
        </Box>
        <Flex gap={3} wrap="wrap">
          <Badge colorScheme="blue" px={3} py={2}>{activeSheets.length} tareo(s) abierto(s)</Badge>
          {selected?.sheet && <Badge colorScheme="teal" px={3} py={2}>{selected.sheet.siteName} · {selected.sheet.shiftName}</Badge>}
        </Flex>
      </Flex>

      <Grid templateColumns={{ base: '1fr', xl: '360px 1fr' }} gap={5} alignItems="start">
        <Box bg="white" borderWidth="1px" borderRadius="xl" p={5} position={{ xl: 'sticky' }} top={{ xl: 4 }}>
          <Grid gap={4}>
            <FormControl>
              <FormLabel>Tareo abierto</FormLabel>
              <Select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); openSheet(e.target.value) }}>
                <option value="">Seleccionar tareo</option>
                {activeSheets.map((x) => <option key={x.id} value={x.id}>{String(x.attendanceDate).slice(0, 10)} · {x.siteName} · {x.areaName} · {x.shiftName}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Tipo de marcación</FormLabel>
              <Select value={markingType} onChange={(e) => { setMarkingType(e.target.value); resetForNext() }}>
                <option value="entry">Ingreso</option>
                <option value="exit">Salida</option>
                <option value="presence">Presencia</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Modo de lectura</FormLabel>
              <Select value={mode} onChange={(e) => { setMode(e.target.value); resetForNext() }}>
                <option value="laser">Pistola lectora / teclado</option>
                <option value="mobile">Cámara del móvil</option>
              </Select>
            </FormControl>
          </Grid>

          {selected?.sheet && <Grid templateColumns="repeat(3, 1fr)" gap={3} mt={5}>
            <Stat bg="gray.50" borderRadius="xl" p={3}><StatLabel>Personal</StatLabel><StatNumber>{people.length}</StatNumber></Stat>
            <Stat bg="gray.50" borderRadius="xl" p={3}><StatLabel>Ingreso</StatLabel><StatNumber>{people.filter((p) => p.entryAt).length}</StatNumber></Stat>
            <Stat bg="gray.50" borderRadius="xl" p={3}><StatLabel>Salida</StatLabel><StatNumber>{people.filter((p) => p.exitAt).length}</StatNumber></Stat>
          </Grid>}
        </Box>

        <Grid gap={5}>
          <Box bg="white" borderWidth="1px" borderRadius="xl" p={{ base: 4, md: 6 }}>
            <Flex justify="space-between" gap={4} wrap="wrap" mb={5}>
              <Box>
                <Heading size="md">{mode === 'mobile' ? 'Escanear con cámara' : 'Escanear con pistola'}</Heading>
                <Text color="gray.500" fontSize="sm" mt={1}>{mode === 'mobile' ? 'Apunta al código de barras/QR del DNI o fotocheck.' : 'Coloca el cursor y escanea el DNI o fotocheck.'}</Text>
              </Box>
              <Button variant="outline" onClick={resetForNext}>Limpiar</Button>
            </Flex>

            {mode === 'laser' && <FormControl>
              <FormLabel>DNI / Fotocheck</FormLabel>
              <Input ref={inputRef} size="lg" bg="gray.50" value={code} onChange={(e) => { setCode(e.target.value); setNotFoundCode('') }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); previewCode(e.currentTarget.value, 'laser') } }} placeholder="Escanear o escribir código" autoComplete="off" />
              <Text fontSize="xs" color="gray.500" mt={2}>La pistola normalmente escribe el código y presiona Enter. Aquí solo se prepara la confirmación.</Text>
            </FormControl>}

            {mode === 'mobile' && <Box>
              {scanning ? <QrCameraScanner active={scanning} onScan={(value) => previewCode(value, 'mobile')} /> : <Button h="64px" w="100%" colorScheme="teal" fontSize="lg" onClick={() => { resetForNext(); setScanning(true); setMode('mobile') }}>Abrir cámara</Button>}
              {scanning && <Button mt={4} w="100%" variant="outline" onClick={() => setScanning(false)}>Cancelar cámara</Button>}
              <Text fontSize="xs" color="gray.500" mt={3}>En producción debe usarse HTTPS para que el navegador permita abrir la cámara.</Text>
            </Box>}

            {message && <Alert status={candidate ? 'info' : 'warning'} borderRadius="xl" mt={5}><AlertIcon />{message}</Alert>}
          </Box>

          <PersonStatus person={candidate} markingType={markingType} />
          {!candidate && notFoundCode && <NotFoundStatus code={notFoundCode} onNext={resetForNext} />}

          {candidate && <Flex justify="flex-end" gap={3} wrap="wrap">
            <Button variant="outline" onClick={resetForNext}>Cancelar</Button>
            <Button colorScheme="teal" size="lg" onClick={confirmMark} isDisabled={!canConfirm} isLoading={saving}>Confirmar {markNames[markingType]}</Button>
          </Flex>}

          <Box className="rrhh-table-scroll" bg="white" borderWidth="1px" borderRadius="xl">
            <Table size="sm">
              <Thead><Tr><Th>Trabajador</Th><Th>DNI</Th><Th>Mesa</Th><Th>Ingreso</Th><Th>Salida</Th><Th>Estado</Th></Tr></Thead>
              <Tbody>
                {people.map((p) => <Tr key={p.collaboratorId} bg={candidate?.collaboratorId === p.collaboratorId ? 'teal.50' : undefined}>
                  <Td fontWeight="700">{p.lastName}, {p.firstName}<Text fontSize="xs" color="gray.500">{p.employeeCode}</Text></Td>
                  <Td>{p.documentNumber}</Td>
                  <Td>{p.workTableName || '-'}</Td>
                  <Td>{safeTime(p.entryAt)}</Td>
                  <Td>{safeTime(p.exitAt)}</Td>
                  <Td><Badge colorScheme={p.statusCode === 'LATE' ? 'orange' : p.statusCode ? 'green' : 'gray'}>{p.statusName || 'Sin marcar'}</Badge></Td>
                </Tr>)}
                {!people.length && <Tr><Td colSpan={6}><Text color="gray.500">Selecciona un tareo abierto para ver el personal.</Text></Td></Tr>}
              </Tbody>
            </Table>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
