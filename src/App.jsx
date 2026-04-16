import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProductForm from './pages/ProductForm'
import NewSale from './pages/NewSale'
import Revenue from './pages/Revenue'
import ChangePassword from './pages/ChangePassword'
import Clients from './pages/Clients'
import { useAuth } from './contexts/AuthContext'

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/produtos/novo" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
        <Route path="/produtos/:id/editar" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
        <Route path="/vender" element={<ProtectedRoute><NewSale /></ProtectedRoute>} />
        <Route path="/faturamento" element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
        <Route path="/trocar-senha" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/clientes"    element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {user && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
