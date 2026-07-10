import React,{useEffect,useState}from'react'
import{Box,Button,Flex,FormControl,FormLabel,Heading,Input,Select,Spinner,Text}from'@chakra-ui/react'
import api from'../services/api'
import{useToast}from'../services/alerts'

export default function BonusSettings(){
 const toast=useToast(),[settings,setSettings]=useState({paymentFrequency:'monthly',cutoffDay:15}),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false)
 useEffect(()=>{api.get('/bonuses/settings').then(({data})=>setSettings(data)).catch(e=>toast({title:'No se pudo cargar la configuración',description:e.response?.data?.error,status:'error'})).finally(()=>setLoading(false))},[])
 const save=async()=>{setSaving(true);try{const{data}=await api.put('/bonuses/settings',settings);setSettings(data);toast({title:'Configuración de bonos guardada',status:'success'})}catch(e){toast({title:'No se pudo guardar la configuración',description:e.response?.data?.error,status:'error'})}finally{setSaving(false)}}
 if(loading)return <Flex justify="center" py={16}><Spinner/></Flex>
 return <Box>
  <Heading size="lg">Configuración de bonos</Heading>
  <Text color="gray.500" mt={2} mb={7}>Define cómo se generan los nuevos periodos de pago de bonos.</Text>
  <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="xl" boxShadow="sm" maxW="620px" p={{base:5,md:6}}>
   <Flex direction={{base:'column',md:'row'}} gap={4} align={{md:'end'}}>
    <FormControl w={{base:'100%',md:'240px'}}><FormLabel>Frecuencia de pago</FormLabel><Select bg="gray.50" borderColor="gray.300" value={settings.paymentFrequency} onChange={e=>setSettings({...settings,paymentFrequency:e.target.value})} sx={{'> option':{background:'#fff'}}}><option value="monthly">Mensual</option><option value="biweekly">Quincenal</option></Select></FormControl>
    {settings.paymentFrequency==='biweekly'&&<FormControl w={{base:'100%',md:'140px'}}><FormLabel>Día de corte</FormLabel><Input bg="gray.50" borderColor="gray.300" type="number" min="1" max="28" value={settings.cutoffDay} onChange={e=>setSettings({...settings,cutoffDay:e.target.value})}/></FormControl>}
   </Flex>
   <Text color="gray.500" fontSize="sm" mt={4}>Esta configuración se aplicará a los periodos que abras en el módulo Bonos.</Text>
   <Button colorScheme="teal" mt={6} onClick={save} isLoading={saving}>Guardar configuración</Button>
  </Box>
 </Box>
}
