import React, { useEffect, useState } from 'react'
import {
  Box, Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerOverlay,
  Flex, IconButton, Spinner, Text, useDisclosure,
} from '@chakra-ui/react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === '1')
  const navigate = useNavigate()
  const menu = useDisclosure()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) setUser(JSON.parse(userData))
    else navigate('/')
  }, [navigate])

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      localStorage.setItem('sidebarCollapsed', current ? '0' : '1')
      return !current
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  if (!user) return <Flex minH="100vh" align="center" justify="center" bg="gray.50"><Box textAlign="center"><Spinner mb={4} /><Text>Cargando...</Text></Box></Flex>

  return <Flex minH="100vh" bg="gray.50" align="stretch">
    <Box display={{ base: 'none', lg: 'block' }} flex={sidebarCollapsed ? '0 0 76px' : '0 0 250px'} transition="flex-basis 180ms ease">
      <Sidebar user={user} onLogout={handleLogout} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
    </Box>

    <Flex
      display={{ base: 'flex', lg: 'none' }} position="fixed" inset="0 0 auto 0"
      zIndex="sticky" h="64px" px={{ base: 4, md: 6 }} bg="gray.800" color="white"
      align="center" justify="space-between" boxShadow="sm"
    >
      <Box minW={0}>
        <Text fontWeight="700" noOfLines={1}>{user?.company?.tradeName || user?.company?.businessName || 'Core RR. HH.'}</Text>
        <Text fontSize="xs" color="gray.300" noOfLines={1}>{user?.name}</Text>
      </Box>
      <IconButton aria-label="Abrir menú" onClick={menu.onOpen} variant="ghost" color="white" fontSize="2xl" icon={<Text>☰</Text>} />
    </Flex>

    <Drawer isOpen={menu.isOpen} placement="left" onClose={menu.onClose} size="xs">
      <DrawerOverlay />
      <DrawerContent bg="gray.800" maxW={{ base: '85vw', md: '320px' }}>
        <DrawerCloseButton color="white" zIndex={2} />
        <DrawerBody p={0}>
          <Sidebar user={user} onLogout={handleLogout} onNavigate={menu.onClose} isDrawer />
        </DrawerBody>
      </DrawerContent>
    </Drawer>

    <Box flex={1} minW={0} overflowX="hidden" pt={{ base: '64px', lg: 0 }}>
      <Box p={{ base: 3, sm: 4, md: 5, lg: 6 }} maxW="100%">
        {children || <Outlet />}
      </Box>
    </Box>
  </Flex>
}
