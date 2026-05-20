import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Entry from './pages/Entry'
import TradeContracts from './pages/TradeContracts'
import TradeOrders from './pages/TradeOrders'
import Quality from './pages/Quality'
import Settlement from './pages/Settlement'
import TradeCommissions from './pages/TradeCommissions'
import Warehouse from './pages/Warehouse'
import Files from './pages/Files'
import Pipeline from './pages/Pipeline'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Users from './pages/Users'

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
        {/* XNK Trade System */}
        <Route path="entry" element={<Entry />} />
        <Route path="trade-contracts" element={<TradeContracts />} />
        <Route path="trade-orders" element={<TradeOrders />} />
        <Route path="quality" element={<Quality />} />
        <Route path="settlement" element={<Settlement />} />
        <Route path="trade-commissions" element={<TradeCommissions />} />
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
