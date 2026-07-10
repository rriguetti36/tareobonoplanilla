import React, { useEffect, useState } from 'react'
import {
  Badge, Box, Button, Flex, FormControl, FormLabel, Grid, Heading, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader,
  ModalOverlay, Select, Spinner, Tab, TabList, Tabs, Table, Tbody, Td,
  Text, Textarea, Th, Thead, Tr,
} from '@chakra-ui/react'
import api from '../services/api'
import { useToast } from '../services/alerts'

const catalogs = [
  { key: 'roles', title: 'Roles', singular: 'rol', endpoint: '/core/roles' },
  { key: 'positions', title: 'Cargos', singular: 'cargo', endpoint: '/core/positions' },
  { key: 'employmentTypes', title: 'Tipos de vínculo', singular: 'tipo de vínculo', endpoint: '/core/employment-types' },
  { key: 'areas', title: 'Áreas', singular: 'área', endpoint: '/core/areas' },
  { key: 'toleranceRules', title: 'Reglas de tolerancia', singular: 'regla', endpoint: '/core/tolerance-rules', tolerance: true },
  { key: 'attendanceStatuses', title: 'Estados de asistencia', singular: 'estado de asistencia', endpoint: '/core/attendance-statuses' },
  { key: 'incidentTypes', title: 'Tipos de incidencia', singular: 'tipo de incidencia', endpoint: '/core/incident-types' },
  { key: 'contractTemplates', title: 'Modelos de contrato', singular: 'modelo de contrato', endpoint: '/core/contract-templates', contractTemplate: true },
]
const emptyItem = { code: '', name: '', title: '', bodyText: '', footerText: '', isDefault: 0, description: '', estado: 1, entryToleranceMinutes: 0, lateAfterMinutes: 1, absenceAfterMinutes: 60, exitToleranceMinutes: 0 }

export default function Catalogs() {
  const [catalogIndex, setCatalogIndex] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [editingCode, setEditingCode] = useState(null)
  const [form, setForm] = useState(emptyItem)
  const toast = useToast()
  const catalog = catalogs[catalogIndex]

  const loadItems = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`${catalog.endpoint}?includeInactive=true`)
      setItems(data)
      setError(null)
    } catch (requestError) {
      setError(requestError.response?.data?.error || `No se pudo cargar ${catalog.title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadItems() }, [catalogIndex])

  const openCreate = () => {
    setEditingCode(null)
    setForm(emptyItem)
    setIsOpen(true)
  }

  const openEdit = (item) => {
    setEditingCode(catalog.contractTemplate ? item.id : item.code)
    setForm({ ...emptyItem, ...item, description: item.description || '', estado: item.estado ? 1 : 0 })
    setIsOpen(true)
  }

  const saveItem = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingCode) await api.put(`${catalog.endpoint}/${editingCode}`, form)
      else await api.post(catalog.endpoint, form)
      toast({ title: `${catalog.singular} ${editingCode ? 'actualizado' : 'creado'}`, status: 'success', duration: 2500 })
      setIsOpen(false)
      await loadItems()
    } catch (requestError) {
      toast({ title: 'No se pudo guardar', description: requestError.response?.data?.error || requestError.message, status: 'error', duration: 3500 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" gap={4} mb={7}>
        <Box>
          <Text color="teal.600" fontWeight="700" fontSize="sm">CONFIGURACIÓN DEL CORE</Text>
          <Heading size="lg" mt={1}>Catálogos</Heading>
          <Text color="gray.500" mt={2}>Valores reutilizados por todos los módulos.</Text>
        </Box>
        <Button colorScheme="teal" onClick={openCreate}>Nuevo {catalog.singular}</Button>
      </Flex>

      <Tabs index={catalogIndex} onChange={setCatalogIndex} colorScheme="teal" mb={5}>
        <TabList overflowX="auto" overflowY="hidden">{catalogs.map((item) => <Tab key={item.key} flexShrink={0}>{item.title}</Tab>)}</TabList>
      </Tabs>

      <Box bg="white" borderRadius="xl" boxShadow="sm" borderWidth="1px" overflow="hidden">
        <Box px={6} py={5} borderBottomWidth="1px"><Heading size="md">{catalog.title}</Heading></Box>
        {loading ? <Flex justify="center" py={12}><Spinner color="teal.500" /></Flex> : error ? (
          <Text color="red.500" p={6}>{error}</Text>
        ) : (
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead bg="gray.50"><Tr><Th>Nombre</Th><Th>Código</Th>{catalog.tolerance ? <><Th>Ingreso</Th><Th>Tardanza</Th><Th>Ausencia</Th><Th>Salida</Th></> : catalog.contractTemplate ? <><Th>Título</Th><Th>Predeterminado</Th></> : <><Th>Descripción</Th><Th>Tipo</Th></>}<Th>Estado</Th><Th /></Tr></Thead>
              <Tbody>
                {items.map((item) => (
                  <Tr key={item.code}>
                    <Td fontWeight="600">{item.name}</Td>
                    <Td><Badge colorScheme="purple">{item.code}</Badge></Td>
                    {catalog.tolerance ? <>
                      <Td>{item.entryToleranceMinutes} min</Td><Td>{item.lateAfterMinutes} min</Td><Td>{item.absenceAfterMinutes} min</Td><Td>{item.exitToleranceMinutes} min</Td>
                    </> : catalog.contractTemplate ? <><Td>{item.title}</Td><Td><Badge colorScheme={item.isDefault?'teal':'gray'}>{item.isDefault?'Sí':'No'}</Badge></Td></> : <><Td color="gray.600">{item.description || '—'}</Td><Td>{item.isSystem ? 'Base' : 'Personalizado'}</Td></>}
                    <Td><Badge colorScheme={item.estado ? 'green' : 'gray'}>{item.estado ? 'Activo' : 'Inactivo'}</Badge></Td>
                    <Td><Button size="sm" variant="outline" onClick={() => openEdit(item)}>Editar</Button></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size={catalog.contractTemplate?'4xl':'md'} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCode ? 'Editar' : 'Crear'} {catalog.singular}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired mb={4}><FormLabel>Nombre</FormLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormControl>
            <FormControl mb={4} isDisabled={Boolean(editingCode)}><FormLabel>Código</FormLabel><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Se genera desde el nombre" /></FormControl>
            {!catalog.contractTemplate && <FormControl mb={4}><FormLabel>Descripción</FormLabel><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormControl>}
            {catalog.contractTemplate && <>
              <FormControl isRequired mb={4}><FormLabel>Título del documento</FormLabel><Input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></FormControl>
              <FormControl isRequired mb={4}><FormLabel>Texto del contrato</FormLabel><Textarea minH="300px" value={form.bodyText} onChange={(e)=>setForm({...form,bodyText:e.target.value})}/><Text fontSize="xs" color="gray.500" mt={2}>Variables: {'{{empresa_razon_social}}'}, {'{{empresa_ruc}}'}, {'{{colaborador_nombre}}'}, {'{{documento_numero}}'}, {'{{cargo}}'}, {'{{tipo_vinculo}}'}, {'{{fecha_inicio}}'}, {'{{fecha_fin}}'}, {'{{numero_contrato}}'}.</Text></FormControl>
              <FormControl mb={4}><FormLabel>Texto al pie</FormLabel><Textarea value={form.footerText} onChange={(e)=>setForm({...form,footerText:e.target.value})}/></FormControl>
              <FormControl mb={4}><FormLabel>Plantilla predeterminada</FormLabel><Select value={Number(form.isDefault||0)} onChange={(e)=>setForm({...form,isDefault:Number(e.target.value)})}><option value={0}>No</option><option value={1}>Sí</option></Select></FormControl>
            </>}
            {catalog.tolerance && <Grid templateColumns={{ base: '1fr', sm: 'repeat(2,1fr)' }} gap={4} mb={4}>
              <FormControl isRequired><FormLabel>Tolerancia de ingreso (min)</FormLabel><Input type="number" min="0" value={form.entryToleranceMinutes} onChange={(e) => setForm({ ...form, entryToleranceMinutes: e.target.value })} /></FormControl>
              <FormControl isRequired><FormLabel>Tardanza desde (min)</FormLabel><Input type="number" min="0" value={form.lateAfterMinutes} onChange={(e) => setForm({ ...form, lateAfterMinutes: e.target.value })} /></FormControl>
              <FormControl isRequired><FormLabel>Ausencia desde (min)</FormLabel><Input type="number" min="0" value={form.absenceAfterMinutes} onChange={(e) => setForm({ ...form, absenceAfterMinutes: e.target.value })} /></FormControl>
              <FormControl isRequired><FormLabel>Tolerancia de salida (min)</FormLabel><Input type="number" min="0" value={form.exitToleranceMinutes} onChange={(e) => setForm({ ...form, exitToleranceMinutes: e.target.value })} /></FormControl>
            </Grid>}
            {editingCode && <FormControl><FormLabel>Estado</FormLabel><Select value={form.estado} onChange={(e) => setForm({ ...form, estado: Number(e.target.value) })}><option value={1}>Activo</option><option value={0}>Inactivo</option></Select></FormControl>}
          </ModalBody>
          <ModalFooter><Button variant="ghost" mr={3} onClick={() => setIsOpen(false)}>Cancelar</Button><Button colorScheme="teal" onClick={saveItem} isLoading={saving}>Guardar</Button></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}
