import React, { useEffect, useMemo, useState } from 'react'
import {
  Badge, Box, Button, Checkbox, Flex, FormControl, FormLabel, Grid, Heading,
  Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter,
  ModalHeader, ModalOverlay, Select, Spinner, Stack, Table, Tbody, Td, Text,
  Textarea, Th, Thead, Tr,
} from '@chakra-ui/react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import { confirmAction, requestReason, useToast } from '../services/alerts'

const config = {
  hire: { title: 'Altas', singular: 'alta', date: 'event' },
  termination: { title: 'Bajas', singular: 'baja', date: 'event' },
  contract: { title: 'Contratos', singular: 'contrato', date: 'period' },
  vacation: { title: 'Vacaciones', singular: 'vacación', date: 'period' },
  leave: { title: 'Licencias', singular: 'licencia', date: 'period' },
  incident: { title: 'Incidencias', singular: 'incidencia', date: 'event' },
  justification: { title: 'Justificaciones', singular: 'justificación', date: 'none' },
}

const statuses = {
  draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobado',
  rejected: 'Rechazado', cancelled: 'Cancelado',
  issued: 'Emitido',
}
const processReasons = { hire:'Alta de colaborador',termination:'Baja de colaborador',contract:'Emisión de contrato',vacation:'Goce vacacional',leave:'Licencia laboral',justification:'Justificación de incidencia' }

const empty = {
  collaboratorId: '', incidentTypeId: '', contractTemplateId: '', relatedProcessId: '', employmentTypeId: '', contractNumber: '',
  eventDate: '', startDate: '', endDate: '', days: '', isPaid: true, reason: '',
  description: '', status: 'draft', estado: 1,
}

export default function PersonnelProcesses() {
  const { type } = useParams()
  const meta = config[type] || config.incident
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const isAdmin = user?.role === 'admin'
  const usesApproval = ['hire', 'termination'].includes(type)
  const canManage = ['admin', 'rrhh'].includes(user?.role)
    || (user?.role === 'supervisor' && ['incident', 'justification'].includes(type))
  const isMulti = type !== 'justification'
  const toast = useToast()

  const [items, setItems] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [employmentTypes, setEmploymentTypes] = useState([])
  const [incidentTypes, setIncidentTypes] = useState([])
  const [contractTemplates, setContractTemplates] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/personnel-processes/${type}`),
      api.get('/collaborators'),
      api.get('/core/employment-types'),
      type === 'incident' ? api.get('/core/incident-types') : Promise.resolve({ data: [] }),
      type === 'contract' ? api.get('/core/contract-templates') : Promise.resolve({ data: [] }),
      type === 'justification' ? api.get('/personnel-processes/incident') : Promise.resolve({ data: [] }),
    ]).then(([records, people, types, incidentTypeData, templateData, incidentData]) => {
      setItems(records.data)
      setCollaborators(people.data)
      setEmploymentTypes(types.data)
      setIncidentTypes(incidentTypeData.data)
      setContractTemplates(templateData.data)
      setIncidents(incidentData.data)
    }).catch((error) => toast({
      title: 'No se pudo cargar', description: error.response?.data?.error, status: 'error',
    })).finally(() => setLoading(false))
  }

  useEffect(load, [type])

  const filteredCollaborators = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    const eligible = type === 'hire'
      ? collaborators.filter((person) => !person.estado)
      : type === 'termination'
        ? collaborators.filter((person) => person.estado)
        : type === 'contract'
          ? collaborators.filter((person) => person.hasApprovedHire)
          : collaborators
    if (!term) return eligible
    return eligible.filter((person) => (
      `${person.firstName} ${person.lastName} ${person.employeeCode || ''} ${person.documentNumber || ''} ${person.positionName || ''}`
        .toLocaleLowerCase('es').includes(term)
    ))
  }, [collaborators, search, type])

  const openNew = () => {
    setEditing(null)
    setForm({ ...empty, contractTemplateId: contractTemplates.find((item) => item.isDefault)?.id || '' })
    setSelectedIds([])
    setSearch('')
    setOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item.id)
    setSelectedIds([item.collaboratorId])
    setSearch('')
    setForm({
      ...item,
      eventDate: item.eventDate ? String(item.eventDate).slice(0, 10) : '',
      startDate: item.startDate ? String(item.startDate).slice(0, 10) : '',
      endDate: item.endDate ? String(item.endDate).slice(0, 10) : '',
      relatedProcessId: item.relatedProcessId || '',
      employmentTypeId: item.employmentTypeId || '',
      incidentTypeId: item.incidentTypeId || '',
      contractTemplateId: item.contractTemplateId || '',
    })
    setOpen(true)
  }

  const selectPerson = (id) => {
    if (editing || !isMulti) {
      setSelectedIds([id])
      setForm((current) => ({ ...current, collaboratorId: id, relatedProcessId: '' }))
      return
    }
    setSelectedIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id])
  }

  const toggleFiltered = () => {
    const filteredIds = filteredCollaborators.map((person) => person.id)
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id))
    setSelectedIds((current) => allSelected
      ? current.filter((id) => !filteredIds.includes(id))
      : [...new Set([...current, ...filteredIds])])
  }

  const save = async () => {
    if (!selectedIds.length) {
      toast({ title: 'Selecciona al menos un colaborador', status: 'warning' })
      return
    }

    setSaving(true)
    try {
      const processForm = usesApproval ? { ...form, status: 'pending' } : form
      if (editing) {
        await api.put(`/personnel-processes/${type}/${editing}`, {
          ...processForm, collaboratorId: selectedIds[0],
        })
      } else {
        const requests = selectedIds.map((collaboratorId) => {
          const person = collaborators.find((item) => item.id === collaboratorId)
          const contractNumber = type === 'contract' && selectedIds.length > 1
            ? `${form.contractNumber}-${person?.employeeCode || collaboratorId}`
            : form.contractNumber
          return api.post(`/personnel-processes/${type}`, { ...processForm, collaboratorId, contractNumber })
        })
        await Promise.all(requests)
      }
      toast({
        title: editing ? `${meta.singular} guardada` : `${selectedIds.length} registro(s) creado(s)`,
        status: 'success',
      })
      setOpen(false)
      load()
    } catch (error) {
      toast({
        title: 'No se pudo completar el registro',
        description: error.response?.data?.error,
        status: 'error',
      })
      load()
    } finally {
      setSaving(false)
    }
  }

  const decide = async (item, decision) => {
    let decisionNotes = ''
    if (decision === 'approved') {
      if (!await confirmAction({ title: `Aprobar ${meta.singular}`, text: 'Esta acción actualizará la ficha y el estado laboral del colaborador.', confirmText: 'Sí, aprobar' })) return
    } else {
      decisionNotes = await requestReason({ title: `Rechazar ${meta.singular}`, label: 'Motivo del rechazo', confirmText: 'Rechazar solicitud' })
      if (!decisionNotes) return
    }
    try {
      await api.patch(`/personnel-processes/${type}/${item.id}/decision`, { decision, decisionNotes })
      toast({ title: decision === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada', status: 'success' })
      load()
    } catch (error) {
      toast({ title: 'No se pudo procesar la solicitud', description: error.response?.data?.error, status: 'error' })
    }
  }

  const saveBlob = (data, filename) => { const url=URL.createObjectURL(new Blob([data],{type:'application/pdf'}));const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url) }
  const contractPdf = async (item, generate=false, signed=false) => { try { const url=`/personnel-processes/contract/${item.id}/${signed?'signed-pdf':generate?'generate-pdf':'pdf'}`;const response=generate?await api.post(url,null,{responseType:'blob'}):await api.get(url,{responseType:'blob'});saveBlob(response.data,`contrato-${item.contractNumber}${signed?'-firmado':''}.pdf`);toast({title:generate?'Contrato PDF generado':'PDF descargado',status:'success'});if(generate)load() } catch(error){toast({title:'No se pudo obtener el PDF',description:error.response?.data?.error,status:'error'})} }
  const uploadSigned = async (item,file) => { if(!file)return;const body=new FormData();body.append('contract',file);try{await api.put(`/personnel-processes/contract/${item.id}/signed-pdf`,body);toast({title:'Contrato firmado cargado',status:'success'});load()}catch(error){toast({title:'No se pudo cargar el contrato firmado',description:error.response?.data?.error,status:'error'})} }
  const confirmSigned = async (item) => { if(!await confirmAction({title:'Confirmar contrato firmado',text:'Después de confirmar, el contrato quedará cerrado y no podrá editarse ni reemplazarse.',confirmText:'Sí, marcar como firmado',icon:'warning'}))return;try{await api.patch(`/personnel-processes/contract/${item.id}/confirm-signed`);toast({title:'Contrato confirmado como firmado',status:'success'});load()}catch(error){toast({title:'No se pudo confirmar',description:error.response?.data?.error,status:'error'})} }

  const dateText = (item) => item.eventDate
    ? String(item.eventDate).slice(0, 10)
    : (item.startDate ? `${String(item.startDate).slice(0, 10)} a ${String(item.endDate).slice(0, 10)}` : '—')
  const availableIncidents = incidents.filter((item) => !selectedIds[0] || item.collaboratorId === selectedIds[0])
  const assignedReason = type==='incident' ? (incidentTypes.find((item)=>item.id===Number(form.incidentTypeId))?.name||'Selecciona el tipo de incidencia') : processReasons[type]
  const allFilteredSelected = filteredCollaborators.length > 0
    && filteredCollaborators.every((person) => selectedIds.includes(person.id))

  return <Box>
    <Flex direction={{ base: 'column', sm: 'row' }} gap={4} justify="space-between" align={{ base: 'stretch', sm: 'center' }} mb={7}>
      <Box>
        <Heading size="lg">{meta.title}</Heading>
        <Text color="gray.500" mt={2}>{usesApproval ? 'Las solicitudes requieren aprobación del rol Admin.' : 'Gestión y seguimiento del proceso de personal.'}</Text>
      </Box>
      {canManage && <Button colorScheme="teal" onClick={openNew}>Nueva {meta.singular}</Button>}
    </Flex>

    <Box bg="white" borderWidth="1px" borderRadius="xl" overflowX="auto">
      {loading ? <Flex justify="center" py={12}><Spinner /></Flex> : <Table>
        <Thead bg="gray.50"><Tr>
          <Th>Colaborador</Th><Th>Fecha / período</Th><Th>Motivo</Th>
          <Th>Estado</Th><Th>Registrado por</Th><Th />
        </Tr></Thead>
        <Tbody>{items.map((item) => <Tr key={item.id}>
          <Td fontWeight="600">{item.lastName}, {item.firstName}
            <Text fontSize="xs" color="gray.500">{item.employeeCode}</Text>
            <Text fontSize="xs" color="teal.600">{item.positionName || 'Sin cargo'}</Text>
          </Td>
          <Td>{dateText(item)}</Td>
          <Td>{item.incidentTypeName && <Text fontWeight="600">{item.incidentTypeName}</Text>}{item.reason || item.description || '—'}</Td>
          <Td><Badge colorScheme={item.status === 'approved' ? 'green' : item.status === 'issued' ? 'teal' : item.status === 'rejected' ? 'red' : item.status === 'pending' ? 'orange' : 'gray'}>{statuses[item.status]}</Badge>{type==='contract'&&<Badge ml={2} colorScheme={item.documentStatus==='signed'?'green':'orange'}>{item.documentStatus==='signed'?'Firmado':'Pendiente de firma'}</Badge>}</Td>
          <Td>{item.createdByName}{item.approvedByName && <Text fontSize="xs" color="gray.500">Decisión: {item.approvedByName}</Text>}</Td>
          <Td><Flex gap={2}>
            {canManage && (!usesApproval || item.status === 'pending') && !(type==='contract'&&item.documentStatus==='signed') && <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Editar</Button>}
            {isAdmin && usesApproval && item.status === 'pending' && <>
              <Button size="sm" colorScheme="green" onClick={() => decide(item, 'approved')}>Aprobar</Button>
              <Button size="sm" colorScheme="red" variant="outline" onClick={() => decide(item, 'rejected')}>Rechazar</Button>
            </>}
            {type==='contract'&&<>{item.documentStatus!=='signed'&&<><Button size="sm" colorScheme="teal" variant="outline" onClick={()=>contractPdf(item,true)}>Generar PDF</Button>{item.generatedPdfPath&&<Button size="sm" onClick={()=>contractPdf(item)}>Descargar</Button>}<Button as="label" size="sm" colorScheme="blue" variant="outline" cursor="pointer">Cargar firmado<Input type="file" accept="application/pdf" display="none" onChange={(event)=>uploadSigned(item,event.target.files?.[0])}/></Button>{item.signedPdfPath&&<Button size="sm" colorScheme="green" onClick={()=>confirmSigned(item)}>Firmado</Button>}</>}{item.documentStatus==='signed'&&<Button size="sm" colorScheme="green" onClick={()=>contractPdf(item,false,true)}>Ver firmado</Button>}</>}
          </Flex></Td>
        </Tr>)}</Tbody>
      </Table>}
    </Box>

    <Modal isOpen={open} onClose={() => setOpen(false)} size="5xl" isCentered>
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>{editing ? 'Editar' : 'Nueva'} {meta.singular}</ModalHeader>
        <ModalCloseButton />
        <ModalBody overflow="hidden">
          <Flex direction={{ base: 'column', md: 'row' }} gap={6} maxH={{ md: '65vh' }}>
            <Box w={{ base: '100%', md: '340px' }} flexShrink={0} borderWidth="1px" borderRadius="lg" overflow="hidden">
              <Box p={4} borderBottomWidth="1px" bg="gray.50">
                <Text fontWeight="700" mb={2}>Colaboradores</Text>
                <Input bg="white" placeholder="Buscar por nombre, código o DNI" value={search} onChange={(event) => setSearch(event.target.value)} />
                {!editing && isMulti && <Flex justify="space-between" align="center" mt={3}>
                  <Checkbox isChecked={allFilteredSelected} onChange={toggleFiltered}>Seleccionar visibles</Checkbox>
                  <Badge colorScheme="teal">{selectedIds.length} seleccionados</Badge>
                </Flex>}
              </Box>
              <Stack spacing={0} maxH={{ base: '240px', md: '50vh' }} overflowY="auto">
                {filteredCollaborators.map((person) => <Flex
                  key={person.id} p={3} gap={3} align="center" borderBottomWidth="1px"
                  cursor="pointer" bg={selectedIds.includes(person.id) ? 'teal.50' : 'white'}
                  _hover={{ bg: selectedIds.includes(person.id) ? 'teal.50' : 'gray.50' }}
                  onClick={() => selectPerson(person.id)}
                >
                  <Checkbox isChecked={selectedIds.includes(person.id)} pointerEvents="none" />
                  <Box minW={0}>
                    <Text fontWeight="600" noOfLines={1}>{person.lastName}, {person.firstName}</Text>
                    <Text fontSize="xs" color="gray.500">{person.employeeCode} {person.documentNumber ? `· ${person.documentNumber}` : ''}</Text>
                    <Text fontSize="xs" color="teal.600" noOfLines={1}>{person.positionName || 'Sin cargo'}</Text>
                  </Box>
                </Flex>)}
                {!filteredCollaborators.length && <Text p={5} color="gray.500" textAlign="center">Sin resultados</Text>}
              </Stack>
            </Box>

            <Box flex="1" overflowY="auto" pr={2}>
              <Grid templateColumns={{ base: '1fr', lg: 'repeat(2,1fr)' }} gap={4}>
                {meta.date === 'event' && <FormControl isRequired><FormLabel>Fecha efectiva</FormLabel><Input type="date" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} /></FormControl>}
                {type === 'incident' && <FormControl isRequired><FormLabel>Tipo de incidencia</FormLabel><Select value={form.incidentTypeId} onChange={(event) => setForm({ ...form, incidentTypeId: Number(event.target.value) })}><option value="">Seleccionar</option>{incidentTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormControl>}
                {meta.date === 'period' && <>
                  <FormControl isRequired><FormLabel>Fecha de inicio</FormLabel><Input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></FormControl>
                  <FormControl isRequired><FormLabel>Fecha de fin</FormLabel><Input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></FormControl>
                </>}
                {type === 'contract' && <>
                  <FormControl isRequired><FormLabel>{selectedIds.length > 1 ? 'Número base del contrato' : 'Número de contrato'}</FormLabel><Input value={form.contractNumber} onChange={(event) => setForm({ ...form, contractNumber: event.target.value })} /><Text fontSize="xs" color="gray.500" mt={1}>{selectedIds.length > 1 ? 'Se añadirá el código del colaborador para generar números únicos.' : ''}</Text></FormControl>
                  <FormControl isRequired><FormLabel>Tipo de vínculo</FormLabel><Select value={form.employmentTypeId} onChange={(event) => setForm({ ...form, employmentTypeId: Number(event.target.value) })}><option value="">Seleccionar</option>{employmentTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormControl>
                  <FormControl isRequired><FormLabel>Modelo de contrato</FormLabel><Select value={form.contractTemplateId} onChange={(event)=>setForm({...form,contractTemplateId:Number(event.target.value)})}><option value="">Seleccionar</option>{contractTemplates.map((item)=><option key={item.id} value={item.id}>{item.name}{item.isDefault?' (Predeterminado)':''}</option>)}</Select></FormControl>
                </>}
                {['vacation', 'leave'].includes(type) && <>
                  <FormControl><FormLabel>Días</FormLabel><Input type="number" min="0" step="0.5" value={form.days} onChange={(event) => setForm({ ...form, days: event.target.value })} /></FormControl>
                  <FormControl><FormLabel>Remunerada</FormLabel><Select value={String(form.isPaid)} onChange={(event) => setForm({ ...form, isPaid: event.target.value === 'true' })}><option value="true">Sí</option><option value="false">No</option></Select></FormControl>
                </>}
                {type === 'justification' && <FormControl isRequired><FormLabel>Incidencia relacionada</FormLabel><Select value={form.relatedProcessId} onChange={(event) => setForm({ ...form, relatedProcessId: Number(event.target.value) })}><option value="">Seleccionar</option>{availableIncidents.map((item) => <option key={item.id} value={item.id}>{String(item.eventDate).slice(0, 10)} - {item.reason || item.description}</option>)}</Select></FormControl>}
                <FormControl><FormLabel>Motivo</FormLabel><Input value={assignedReason||''} isReadOnly bg="gray.50" /><Text fontSize="xs" color="gray.500" mt={1}>Asignado automáticamente por el sistema.</Text></FormControl>
                {type==='contract'
                  ? <FormControl><FormLabel>Estado</FormLabel><Input value="Emitido al registrar (requiere Alta aprobada)" isReadOnly /></FormControl>
                  : usesApproval
                  ? <FormControl><FormLabel>Estado</FormLabel><Input value="Pendiente de aprobación del Admin" isReadOnly /></FormControl>
                  : <FormControl><FormLabel>Estado</FormLabel><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></FormControl>}
                <FormControl gridColumn={{ lg: '1 / -1' }}><FormLabel>Descripción</FormLabel><Textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormControl>
              </Grid>
            </Box>
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Text mr="auto" fontSize="sm" color="gray.500">{selectedIds.length ? `${selectedIds.length} colaborador(es) seleccionado(s)` : 'Ningún colaborador seleccionado'}</Text>
          <Button variant="ghost" mr={3} onClick={() => setOpen(false)}>Cancelar</Button>
          <Button colorScheme="teal" onClick={save} isLoading={saving} isDisabled={!selectedIds.length}>{editing ? 'Guardar' : `Crear ${selectedIds.length || ''}`}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  </Box>
}
