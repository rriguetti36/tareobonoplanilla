import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreateUser from './pages/CreateUser'
import UserList from './pages/UserList'
import Catalogs from './pages/Catalogs'
import Collaborators from './pages/Collaborators'
import CollaboratorForm from './pages/CollaboratorForm'
import OrganizationManager from './pages/OrganizationManager'
import Shifts from './pages/Shifts'
import Assignments from './pages/Assignments'
import WorkTables from './pages/WorkTables'
import Holidays from './pages/Holidays'
import PersonnelProcesses from './pages/PersonnelProcesses'
import Attendance from './pages/Attendance'
import AttendanceScanner from './pages/AttendanceScanner'
import AttendanceReport from './pages/AttendanceReport'
import MyContracts from './pages/MyContracts'
import Bonuses from './pages/Bonuses'
import BonusSettings from './pages/BonusSettings'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import DashboardLayout from './components/DashboardLayout'
import RoleRoute from './components/RoleRoute'

export default function App(){
  return (
    <Box>
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard/></DashboardLayout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><AdminRoute><DashboardLayout><UserList/></DashboardLayout></AdminRoute></ProtectedRoute>} />
        <Route path="/users/add" element={<ProtectedRoute><AdminRoute><DashboardLayout><CreateUser/></DashboardLayout></AdminRoute></ProtectedRoute>} />
        <Route path="/catalogs" element={<ProtectedRoute><AdminRoute><DashboardLayout><Catalogs/></DashboardLayout></AdminRoute></ProtectedRoute>} />
        <Route path="/collaborators" element={<ProtectedRoute><RoleRoute roles={['admin', 'rrhh', 'gerencia']}><DashboardLayout><Collaborators/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/collaborators/new" element={<ProtectedRoute><RoleRoute roles={['admin', 'rrhh']}><DashboardLayout><CollaboratorForm/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/collaborators/:id" element={<ProtectedRoute><RoleRoute roles={['admin', 'rrhh', 'gerencia']}><DashboardLayout><CollaboratorForm/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/sites" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh','operaciones','gerencia']}><DashboardLayout><OrganizationManager type="sites"/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh','operaciones','gerencia']}><DashboardLayout><OrganizationManager type="clients"/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/shifts" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh','operaciones','gerencia']}><DashboardLayout><Shifts/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/assignments" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh','operaciones','gerencia']}><DashboardLayout><Assignments/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/work-tables" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh','operaciones','supervisor']}><DashboardLayout><WorkTables/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/holidays" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh','contabilidad','gerencia']}><DashboardLayout><Holidays/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/personnel/:type" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh','operaciones','gerencia','contabilidad']}><DashboardLayout><PersonnelProcesses/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh','operaciones','supervisor','gerencia','colaborador']}><DashboardLayout><Attendance/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/attendance-scanner" element={<ProtectedRoute><RoleRoute roles={['admin','supervisor']}><DashboardLayout><AttendanceScanner/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/attendance-report" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh','operaciones','gerencia']}><DashboardLayout><AttendanceReport/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/my-contracts" element={<ProtectedRoute><RoleRoute roles={['colaborador']}><DashboardLayout><MyContracts/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/bonuses" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh','operaciones','gerencia','supervisor']}><DashboardLayout><Bonuses/></DashboardLayout></RoleRoute></ProtectedRoute>} />
        <Route path="/settings/bonuses" element={<ProtectedRoute><RoleRoute roles={['admin','rrhh']}><DashboardLayout><BonusSettings/></DashboardLayout></RoleRoute></ProtectedRoute>} />
      </Routes>
    </Box>
  )
}
