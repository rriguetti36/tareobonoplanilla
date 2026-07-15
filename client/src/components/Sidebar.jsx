import React from 'react'
import { Box, VStack, Link as ChakraLink, Heading, Button, Divider, Text } from '@chakra-ui/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

const MenuLink = ({ to, children }) => (
  <ChakraLink as={RouterLink} to={to} w="100%" _hover={{ textDecoration: 'none' }}>
    <Box px={2} py={2} borderRadius="md" _hover={{ bg: 'gray.700' }} cursor="pointer">{children}</Box>
  </ChakraLink>
)

export default function Sidebar({ user, onLogout, onNavigate }) {
  const navigate = useNavigate()
  const role = user?.role
  const isAdmin = role === 'admin'
  const isSupervisor = role === 'supervisor'
  const canViewCollaborators = ['admin', 'rrhh', 'gerencia'].includes(role)
  const canViewOrganization = ['admin', 'rrhh', 'operaciones', 'gerencia'].includes(role)
  const canViewHolidays = ['admin', 'rrhh', 'contabilidad', 'gerencia'].includes(role)
  const canViewPersonnel = ['admin', 'rrhh', 'operaciones', 'gerencia', 'contabilidad'].includes(role)
  const canViewAttendance = ['admin', 'rrhh', 'operaciones', 'supervisor', 'gerencia', 'colaborador'].includes(role)
  const canViewAttendanceReport = ['admin', 'rrhh', 'operaciones', 'gerencia'].includes(role)
  const canViewShifts = ['admin', 'rrhh', 'operaciones', 'gerencia'].includes(role)
  const canViewOperation = canViewOrganization || isSupervisor

  return (
    <Box w="250px" maxW="100%" bg="gray.800" color="white" p={6} h="100vh" overflowY="auto">
      <Heading size="md" mb={6}>{user?.name || 'Usuario'}</Heading>
      <Text fontSize="xs" color="gray.400" mt={-4} mb={5}>
        {user?.company?.tradeName || user?.company?.businessName || 'Core RR. HH.'}
      </Text>
      <Divider mb={4} />

      <VStack align="stretch" spacing={2} onClick={() => onNavigate?.()}>
        <MenuLink to="/dashboard">Dashboard</MenuLink>

        {role === 'colaborador' && <>
          <Heading size="sm" pt={4}>Mi asistencia</Heading>
          <MenuLink to="/attendance">Escanear QR</MenuLink>
          <MenuLink to="/my-contracts">Mis contratos</MenuLink>
        </>}

        {canViewCollaborators && <>
          <Heading size="sm" pt={4}>Personas</Heading>
          <MenuLink to="/collaborators">Colaboradores</MenuLink>
        </>}

        {canViewOrganization && <>
          <Heading size="sm" pt={4}>Organizacion</Heading>
          <MenuLink to="/clients">Clientes</MenuLink>
          <MenuLink to="/sites">Sedes</MenuLink>
        </>}

        {canViewPersonnel && <>
          <Heading size="sm" pt={4}>Gestion de personal</Heading>
          <MenuLink to="/personnel/hire">Altas</MenuLink>
          <MenuLink to="/personnel/termination">Bajas</MenuLink>
          <MenuLink to="/personnel/contract">Contratos</MenuLink>
          <MenuLink to="/personnel/vacation">Vacaciones</MenuLink>
          <MenuLink to="/personnel/leave">Licencias</MenuLink>
          <MenuLink to="/personnel/incident">Incidencias</MenuLink>
          <MenuLink to="/personnel/justification">Justificaciones</MenuLink>
        </>}

        {canViewOperation && <>
          <Heading size="sm" pt={4}>Operacion</Heading>
          {!isSupervisor && <MenuLink to="/assignments">Asignacion de personal</MenuLink>}
          {['admin', 'rrhh', 'operaciones', 'supervisor'].includes(role) && <MenuLink to="/work-tables">Mesas de trabajo</MenuLink>}
        </>}
        {canViewAttendance && role !== 'colaborador' && !canViewOperation && <Heading size="sm" pt={4}>Operacion</Heading>}
        {canViewAttendance && role !== 'colaborador' && <MenuLink to="/attendance">Tareo de asistencias</MenuLink>}
        {canViewAttendanceReport && <MenuLink to="/attendance-report">Consulta de tareos</MenuLink>}
        {['admin', 'rrhh', 'operaciones', 'gerencia'].includes(role) && <MenuLink to="/bonuses">Bonos</MenuLink>}

        {isAdmin && <>
          <Heading size="sm" pt={4}>Seguridad</Heading>
          <MenuLink to="/users">Usuarios</MenuLink>
        </>}

        {(isAdmin || canViewHolidays || canViewShifts) && <>
          <Heading size="sm" pt={4}>Configuracion</Heading>
          {isAdmin && <MenuLink to="/catalogs">Catalogos</MenuLink>}
          {canViewShifts && <MenuLink to="/shifts">Turnos</MenuLink>}
          {['admin', 'rrhh'].includes(role) && <MenuLink to="/settings/bonuses">Bonos</MenuLink>}
          {canViewHolidays && <MenuLink to="/holidays">Feriados</MenuLink>}
        </>}
      </VStack>

      <Divider my={4} />
      <Button colorScheme="red" size="sm" w="100%" onClick={() => { onLogout(); navigate('/') }}>Cerrar sesion</Button>
    </Box>
  )
}
