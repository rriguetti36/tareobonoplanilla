import React, { useEffect, useState } from 'react'
import {
  Badge, Box, Button, Flex, FormControl, FormLabel, Grid, Heading, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader,
  ModalOverlay, Select, Spinner, Table, Tbody, Td, Text, Textarea, Th,
  Thead, Tr,
} from '@chakra-ui/react'
import api from '../services/api'
import { useToast } from '../services/alerts'

const currentYear = new Date().getFullYear()
const emptyHoliday = { holidayDate: '', name: '', dayType: 'holiday', scope: 'national', isPaid: true, surchargePercent: '', allowSubstituteRest: '', notes: '', estado: 1 }

export default function Holidays() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const canManage = ['admin', 'rrhh'].includes(user?.role)
  const [year, setYear] = useState(currentYear)
  const [items, setItems] = useState([])
  const [policy, setPolicy] = useState({ surchargePercent: 100, allowSubstituteRest: true, useShiftStartDate: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyHoliday)
  const toast = useToast()

  const load = () => {
    setLoading(true)
    Promise.all([api.get(`/holidays?year=${year}`), api.get('/holidays/policy')])
      .then(([holidays, policyData]) => { setItems(holidays.data); setPolicy(policyData.data) })
      .catch((error) => toast({ title: 'No se pudo cargar el calendario', description: error.response?.data?.error, status: 'error' }))
      .finally(() => setLoading(false))
  }
  useEffect(load, [year])

  const openNew = () => { setEditingId(null); setForm({ ...emptyHoliday, holidayDate: `${year}-01-01` }); setOpen(true) }
  const openEdit = (item) => { setEditingId(item.id); setForm({ ...item, holidayDate: String(item.holidayDate).slice(0, 10), surchargePercent: item.surchargePercent ?? '', allowSubstituteRest: item.allowSubstituteRest ?? '' }); setOpen(true) }
  const saveHoliday = async () => {
    setSaving(true)
    try {
      const payload = { ...form, isPaid: String(form.isPaid) === 'true', allowSubstituteRest: form.allowSubstituteRest === '' ? '' : String(form.allowSubstituteRest) === 'true' }
      editingId ? await api.put(`/holidays/${editingId}`, payload) : await api.post('/holidays', payload)
      toast({ title: 'Fecha guardada', status: 'success' }); setOpen(false); load()
    } catch (error) { toast({ title: 'No se pudo guardar', description: error.response?.data?.error, status: 'error' }) }
    finally { setSaving(false) }
  }
  const savePolicy = async () => {
    setSaving(true)
    try { const { data } = await api.put('/holidays/policy', policy); setPolicy(data); toast({ title: 'Política actualizada', status: 'success' }) }
    catch (error) { toast({ title: 'No se pudo actualizar', description: error.response?.data?.error, status: 'error' }) }
    finally { setSaving(false) }
  }

  return <Box>
    <Flex justify="space-between" align="center" mb={7}><Box><Heading size="lg">Calendario de feriados</Heading><Text color="gray.500" mt={2}>Configuración laboral utilizada por Tareo y Planillas.</Text></Box>{canManage && <Button colorScheme="teal" onClick={openNew}>Nueva fecha</Button>}</Flex>
    <Box bg="white" borderWidth="1px" borderRadius="xl" p={6} mb={6}>
      <Heading size="md" mb={5}>Política general</Heading><Grid templateColumns={{ base: '1fr', md: 'repeat(3,1fr)' }} gap={5}>
        <FormControl><FormLabel>Sobretasa predeterminada (%)</FormLabel><Input type="number" min="0" isReadOnly={!canManage} value={policy.surchargePercent} onChange={(e) => setPolicy({ ...policy, surchargePercent: e.target.value })} /></FormControl>
        <FormControl><FormLabel>Permitir descanso sustitutorio</FormLabel><Select isDisabled={!canManage} value={policy.allowSubstituteRest ? 'true' : 'false'} onChange={(e) => setPolicy({ ...policy, allowSubstituteRest: e.target.value === 'true' })}><option value="true">Sí</option><option value="false">No</option></Select></FormControl>
        <FormControl><FormLabel>Fecha que determina el feriado</FormLabel><Select isDisabled={!canManage} value={policy.useShiftStartDate ? 'start' : 'end'} onChange={(e) => setPolicy({ ...policy, useShiftStartDate: e.target.value === 'start' })}><option value="start">Inicio del turno</option><option value="end">Fin del turno</option></Select></FormControl>
      </Grid>{canManage && <Button mt={5} variant="outline" colorScheme="teal" onClick={savePolicy} isLoading={saving}>Guardar política</Button>}
    </Box>
    <Flex mb={4} align="center" gap={3}><FormLabel mb={0}>Año</FormLabel><Select value={year} onChange={(e) => setYear(Number(e.target.value))} maxW="140px">{Array.from({ length: 5 }, (_, index) => currentYear - 1 + index).map((value) => <option key={value}>{value}</option>)}</Select></Flex>
    <Box bg="white" borderWidth="1px" borderRadius="xl" overflowX="auto">{loading ? <Flex justify="center" py={12}><Spinner /></Flex> : <Table><Thead bg="gray.50"><Tr><Th>Fecha</Th><Th>Nombre</Th><Th>Tipo</Th><Th>Alcance</Th><Th>Sobretasa</Th><Th>Descanso sustitutorio</Th><Th>Estado</Th><Th /></Tr></Thead><Tbody>{items.map((item) => <Tr key={item.id}><Td>{String(item.holidayDate).slice(0,10)}</Td><Td fontWeight="600">{item.name}</Td><Td>{item.dayType === 'holiday' ? 'Feriado' : 'Día no laborable'}</Td><Td>{({national:'Nacional',regional:'Regional',company:'Empresa'})[item.scope]}</Td><Td>{item.effectiveSurchargePercent}%</Td><Td>{item.effectiveAllowSubstituteRest ? 'Permitido' : 'No permitido'}</Td><Td><Badge colorScheme={item.estado ? 'green' : 'gray'}>{item.estado ? 'Activo' : 'Inactivo'}</Badge></Td><Td>{canManage && <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Editar</Button>}</Td></Tr>)}</Tbody></Table>}</Box>
    <Modal isOpen={open} onClose={() => setOpen(false)} size="2xl" isCentered><ModalOverlay /><ModalContent><ModalHeader>{editingId ? 'Editar fecha' : 'Nueva fecha'}</ModalHeader><ModalCloseButton /><ModalBody><Grid templateColumns={{ base:'1fr',md:'repeat(2,1fr)' }} gap={4}>
      <FormControl isRequired><FormLabel>Fecha</FormLabel><Input type="date" value={form.holidayDate} onChange={(e) => setForm({ ...form, holidayDate:e.target.value })} /></FormControl><FormControl isRequired><FormLabel>Nombre</FormLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name:e.target.value })} /></FormControl>
      <FormControl><FormLabel>Tipo</FormLabel><Select value={form.dayType} onChange={(e) => setForm({ ...form, dayType:e.target.value })}><option value="holiday">Feriado</option><option value="non_working_day">Día no laborable</option></Select></FormControl><FormControl><FormLabel>Alcance</FormLabel><Select value={form.scope} onChange={(e) => setForm({ ...form, scope:e.target.value })}><option value="national">Nacional</option><option value="regional">Regional</option><option value="company">Empresa</option></Select></FormControl>
      <FormControl><FormLabel>Remunerado</FormLabel><Select value={String(form.isPaid)} onChange={(e) => setForm({ ...form, isPaid:e.target.value })}><option value="true">Sí</option><option value="false">No</option></Select></FormControl><FormControl><FormLabel>Sobretasa particular</FormLabel><Input type="number" placeholder={`Usar ${policy.surchargePercent}%`} value={form.surchargePercent} onChange={(e) => setForm({ ...form, surchargePercent:e.target.value })} /></FormControl>
      <FormControl><FormLabel>Descanso sustitutorio</FormLabel><Select value={String(form.allowSubstituteRest)} onChange={(e) => setForm({ ...form, allowSubstituteRest:e.target.value })}><option value="">Usar política general</option><option value="true">Permitido</option><option value="false">No permitido</option></Select></FormControl><FormControl><FormLabel>Estado</FormLabel><Select value={form.estado ? 1 : 0} onChange={(e) => setForm({ ...form, estado:Number(e.target.value) })}><option value={1}>Activo</option><option value={0}>Inactivo</option></Select></FormControl>
      <FormControl gridColumn={{md:'1 / -1'}}><FormLabel>Notas</FormLabel><Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes:e.target.value })} /></FormControl>
    </Grid></ModalBody><ModalFooter><Button variant="ghost" mr={3} onClick={() => setOpen(false)}>Cancelar</Button><Button colorScheme="teal" onClick={saveHoliday} isLoading={saving}>Guardar</Button></ModalFooter></ModalContent></Modal>
  </Box>
}
