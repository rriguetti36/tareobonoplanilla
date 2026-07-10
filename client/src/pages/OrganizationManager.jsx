import React, { useEffect, useState } from 'react'
import {
  Badge, Box, Button, Flex, FormControl, FormLabel, Grid, Heading, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader,
  ModalOverlay, Select, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr,
} from '@chakra-ui/react'
import api from '../services/api'
import { useToast } from '../services/alerts'

const configs = {
  sites: {
    title: 'Sedes', singular: 'sede', endpoint: '/organization/sites',
    empty: { clientId: '', code: '', name: '', address: '', department: '', province: '', district: '', estado: 1 },
    columns: [['clientName','Cliente'],['code','Código'],['name','Nombre'],['address','Dirección'],['district','Distrito']],
    fields: [['code','Código',true],['name','Nombre',true],['address','Dirección'],['department','Departamento'],['province','Provincia'],['district','Distrito']],
  },
  clients: {
    title: 'Clientes', singular: 'cliente', endpoint: '/organization/clients',
    empty: { documentType: 'RUC', documentNumber: '', businessName: '', tradeName: '', contactName: '', contactEmail: '', contactPhone: '', estado: 1 },
    columns: [['documentNumber','Documento'],['businessName','Razón social'],['tradeName','Nombre comercial'],['contactName','Contacto']],
    fields: [['documentNumber','Número de documento',true],['businessName','Razón social',true],['tradeName','Nombre comercial'],['contactName','Contacto'],['contactEmail','Email de contacto'],['contactPhone','Teléfono de contacto']],
  },
}

export default function OrganizationManager({ type }) {
  const config = configs[type]
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const canManage = ['admin','rrhh','operaciones'].includes(user?.role)
  const [items,setItems] = useState([]), [loading,setLoading] = useState(true)
  const [clients,setClients] = useState([])
  const [isOpen,setIsOpen] = useState(false), [editingId,setEditingId] = useState(null)
  const [form,setForm] = useState(config.empty), [saving,setSaving] = useState(false)
  const toast = useToast()
  const load = () => { setLoading(true); Promise.all([api.get(config.endpoint), type==='sites'?api.get('/organization/clients'):Promise.resolve({data:[]})]).then(([records,clientRecords])=>{setItems(records.data);setClients(clientRecords.data.filter(x=>x.estado))}).catch(e=>toast({title:'No se pudo cargar',description:e.response?.data?.error,status:'error'})).finally(()=>setLoading(false)) }
  useEffect(load,[type])
  const openNew=()=>{setEditingId(null);setForm(config.empty);setIsOpen(true)}
  const openEdit=(item)=>{setEditingId(item.id);setForm(item);setIsOpen(true)}
  const save=async()=>{setSaving(true);try{editingId?await api.put(`${config.endpoint}/${editingId}`,form):await api.post(config.endpoint,form);toast({title:`${config.singular} guardado`,status:'success'});setIsOpen(false);load()}catch(e){toast({title:'No se pudo guardar',description:e.response?.data?.error,status:'error'})}finally{setSaving(false)}}
  return <Box>
    <Flex justify="space-between" align="center" mb={7}><Box><Heading size="lg">{config.title}</Heading><Text color="gray.500" mt={2}>Información de la empresa disponible para todos los módulos.</Text></Box>{canManage&&<Button colorScheme="teal" onClick={openNew}>Nuevo {config.singular}</Button>}</Flex>
    <Box bg="white" borderWidth="1px" borderRadius="xl" overflowX="auto">{loading?<Flex justify="center" py={12}><Spinner/></Flex>:<Table><Thead bg="gray.50"><Tr>{config.columns.map(x=><Th key={x[0]}>{x[1]}</Th>)}<Th>Estado</Th><Th/></Tr></Thead><Tbody>{items.map(item=><Tr key={item.id}>{config.columns.map(x=><Td key={x[0]}>{item[x[0]]||'—'}</Td>)}<Td><Badge colorScheme={item.estado?'green':'gray'}>{item.estado?'Activo':'Inactivo'}</Badge></Td><Td>{canManage&&<Button size="sm" variant="outline" onClick={()=>openEdit(item)}>Editar</Button>}</Td></Tr>)}</Tbody></Table>}</Box>
    <Modal isOpen={isOpen} onClose={()=>setIsOpen(false)} size="2xl" isCentered><ModalOverlay/><ModalContent><ModalHeader>{editingId?'Editar':'Nuevo'} {config.singular}</ModalHeader><ModalCloseButton/><ModalBody><Grid templateColumns={{base:'1fr',md:'repeat(2,1fr)'}} gap={4}>
      {type==='clients'&&<FormControl><FormLabel>Tipo de documento</FormLabel><Select value={form.documentType} onChange={e=>setForm({...form,documentType:e.target.value})}><option value="RUC">RUC</option><option value="DNI">DNI</option><option value="CE">CE</option></Select></FormControl>}
      {type==='sites'&&<FormControl isRequired><FormLabel>Cliente</FormLabel><Select value={form.clientId||''} onChange={e=>setForm({...form,clientId:Number(e.target.value)})}><option value="">Seleccionar cliente</option>{clients.map(client=><option key={client.id} value={client.id}>{client.tradeName||client.businessName}</option>)}</Select></FormControl>}
      {config.fields.map(([key,label,required])=><FormControl key={key} isRequired={required}><FormLabel>{label}</FormLabel><Input type={key.toLowerCase().includes('email')?'email':'text'} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}/></FormControl>)}
      <FormControl><FormLabel>Estado</FormLabel><Select value={form.estado?1:0} onChange={e=>setForm({...form,estado:Number(e.target.value)})}><option value={1}>Activo</option><option value={0}>Inactivo</option></Select></FormControl>
    </Grid></ModalBody><ModalFooter><Button variant="ghost" mr={3} onClick={()=>setIsOpen(false)}>Cancelar</Button><Button colorScheme="teal" onClick={save} isLoading={saving}>Guardar</Button></ModalFooter></ModalContent></Modal>
  </Box>
}
