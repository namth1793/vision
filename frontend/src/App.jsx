import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Buyers from './pages/Buyers'
import ImportEntry from './pages/ImportEntry'
import ExportEntry from './pages/ExportEntry'
import ExportProgress from './pages/ExportProgress'
import BwhEntry from './pages/BwhEntry'
import Warehouse from './pages/Warehouse'
import Files from './pages/Files'
import Pipeline from './pages/Pipeline'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Users from './pages/Users'
import CommissionTracking from './pages/CommissionTracking'
import GpxkTurkey from './pages/GpxkTurkey'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="history" element={<History />} />
        {/* Master data */}
        <Route path="buyers" element={<Buyers />} />
        <Route path="gpxk-turkey" element={<GpxkTurkey />} />
        {/* XNK tables */}
        <Route path="import-entry" element={<ImportEntry />} />
        <Route path="export-entry" element={<ExportEntry />} />
        <Route path="export-progress" element={<ExportProgress />} />
        <Route path="bwh-entry" element={<BwhEntry />} />
        {/* Commission tracking (admin only) */}
        <Route path="commission" element={<CommissionTracking />} />
        {/* Other modules */}
        <Route path="warehouse" element={<Warehouse />} />
        <Route path="files" element={<Files />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </BrowserRouter>
    </AuthProvider>
  )
}
