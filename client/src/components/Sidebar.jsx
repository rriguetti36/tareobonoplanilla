import React from 'react'
import { Box, VStack, Link as ChakraLink, Heading, Button, Divider, Text, Flex, IconButton, Tooltip } from '@chakra-ui/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'

const MenuLink = ({ to, children, collapsed }) => (
  <Tooltip label={children} placement="right" isDisabled={!collapsed} hasArrow>
    <ChakraLink as={RouterLink} to={to} w="100%" _hover={{ textDecoration: 'none' }}>
      <Box
        px={collapsed ? 2 : 3}
        py={2.5}
        borderRadius="lg"
        _hover={{ bg: 'gray.700' }}
        cursor="pointer"
        textAlign={collapsed ? 'center' : 'left'}
        fontWeight="700"
        fontSize={collapsed ? 'sm' : 'md'}
      >
        {collapsed ? String(children).slice(0, 2).toUpperCase() : children}
      </Box>
    </ChakraLink>
  </Tooltip>
)

const SectionTitle = ({ children, collapsed }) => (
  collapsed ? <Divider pt={3} borderColor="gray.600" /> : <Heading size="sm" pt={4}>{children}</Heading>
)

export default function Sidebar({ user, onLogout, onNavigate, collapsed = false, onToggleCollapse, isDrawer = false }) {
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

  const linkProps = { collapsed }

  return (
    <Flex
      direction="column"
      w={collapsed ? '76px' : '250px'}
      maxW="100%"
      bg="gray.800"
      color="white"
      h={isDrawer ? '100vh' : '100dvh'}
      minH="100vh"
      position={isDrawer ? 'relative' : 'sticky'}
      top={0}
      overflow="hidden"
      transition="width 180ms ease"
    >
      <Box px={collapsed ? 3 : 6} py={5} flexShrink={0}>
        <Flex align="center" justify="space-between" gap={2}>
          {!collapsed && <Box minW={0}>
            <Heading size="md" noOfLines={1}>{user?.name || 'Usuario'}</Heading>
            <Text fontSize="xs" color="gray.400" mt={1} noOfLines={1}>
              {user?.company?.tradeName || user?.company?.businessName || 'Core RR. HH.'}
            </Text>
          </Box>}
          {collapsed && <Text fontWeight="900" fontSize="lg" mx="auto">{(user?.name || 'U').slice(0, 1).toUpperCase()}</Text>}
          {!isDrawer && <IconButton
            aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
            size="sm"
            variant="ghost"
            color="white"
            _hover={{ bg: 'gray.700' }}
            onClick={onToggleCollapse}
            icon={<Text fontSize="lg">{collapsed ? '»' : '«'}</Text>}
          />}
        </Flex>
      </Box>
      <Divider borderColor="gray.700" />

      <Box flex="1" overflowY="auto" px={collapsed ? 2 : 4} py={4}>
        <VStack align="stretch" spacing={2} onClick={() => onNavigate?.()}>
          <MenuLink to="/dashboard" {...linkProps}>Dashboard</MenuLink>

          {role === 'colaborador' && <>
            <SectionTitle collapsed={collapsed}>Mi asistencia</SectionTitle>
            <MenuLink to="/attendance" {...linkProps}>Escanear QR</MenuLink>
            <MenuLink to="/my-contracts" {...linkProps}>Mis contratos</MenuLink>
          </>}

          {canViewCollaborators && <>
            <SectionTitle collapsed={collapsed}>Personas</SectionTitle>
            <MenuLink to="/collaborators" {...linkProps}>Colaboradores</MenuLink>
          </>}

          {canViewOrganization && <>
            <SectionTitle collapsed={collapsed}>Organizacion</SectionTitle>
            <MenuLink to="/clients" {...linkProps}>Clientes</MenuLink>
            <MenuLink to="/sites" {...linkProps}>Sedes</MenuLink>
          </>}

          {canViewPersonnel && <>
            <SectionTitle collapsed={collapsed}>Gestion de personal</SectionTitle>
            <MenuLink to="/personnel/hire" {...linkProps}>Altas</MenuLink>
            <MenuLink to="/personnel/termination" {...linkProps}>Bajas</MenuLink>
            <MenuLink to="/personnel/contract" {...linkProps}>Contratos</MenuLink>
            <MenuLink to="/personnel/vacation" {...linkProps}>Vacaciones</MenuLink>
            <MenuLink to="/personnel/leave" {...linkProps}>Licencias</MenuLink>
            <MenuLink to="/personnel/incident" {...linkProps}>Incidencias</MenuLink>
            <MenuLink to="/personnel/justification" {...linkProps}>Justificaciones</MenuLink>
          </>}

          {canViewOperation && <>
            <SectionTitle collapsed={collapsed}>Operacion</SectionTitle>
            {!isSupervisor && <MenuLink to="/assignments" {...linkProps}>Asignacion de personal</MenuLink>}
            {['admin', 'rrhh', 'operaciones', 'supervisor'].includes(role) && <MenuLink to="/work-tables" {...linkProps}>Mesas de trabajo</MenuLink>}
          </>}
          {canViewAttendance && role !== 'colaborador' && !canViewOperation && <SectionTitle collapsed={collapsed}>Operacion</SectionTitle>}
          {canViewAttendance && role !== 'colaborador' && <MenuLink to="/attendance" {...linkProps}>Tareo de asistencias</MenuLink>}
          {['admin', 'supervisor'].includes(role) && <MenuLink to="/attendance-scanner" {...linkProps}>Escaneo asistencia</MenuLink>}
          {canViewAttendanceReport && <MenuLink to="/attendance-report" {...linkProps}>Consulta de tareos</MenuLink>}
          {['admin', 'rrhh', 'operaciones', 'gerencia', 'supervisor'].includes(role) && <MenuLink to="/bonuses" {...linkProps}>Bonos</MenuLink>}

          {isAdmin && <>
            <SectionTitle collapsed={collapsed}>Seguridad</SectionTitle>
            <MenuLink to="/users" {...linkProps}>Usuarios</MenuLink>
          </>}

          {(isAdmin || canViewHolidays || canViewShifts) && <>
            <SectionTitle collapsed={collapsed}>Configuracion</SectionTitle>
            {isAdmin && <MenuLink to="/catalogs" {...linkProps}>Catalogos</MenuLink>}
            {canViewShifts && <MenuLink to="/shifts" {...linkProps}>Turnos</MenuLink>}
            {['admin', 'rrhh'].includes(role) && <MenuLink to="/settings/bonuses" {...linkProps}>Bonos</MenuLink>}
            {canViewHolidays && <MenuLink to="/holidays" {...linkProps}>Feriados</MenuLink>}
          </>}
        </VStack>
      </Box>

      <Box px={collapsed ? 2 : 4} py={4} flexShrink={0}>
        <Divider mb={4} borderColor="gray.700" />
        <Button colorScheme="red" size="sm" w="100%" px={collapsed ? 0 : 4} onClick={() => { onLogout(); navigate('/') }}>
          {collapsed ? 'Salir' : 'Cerrar sesion'}
        </Button>
      </Box>
    </Flex>
  )
}
