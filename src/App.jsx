import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { StoreAuthProvider } from './contexts/StoreAuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProductForm from './pages/ProductForm'
import NewSale from './pages/NewSale'
import Revenue from './pages/Revenue'
import ChangePassword from './pages/ChangePassword'
import Clients from './pages/Clients'
import Store from './pages/Store'
import StoreLogin from './pages/StoreLogin'
import StoreProfile from './pages/StoreProfile'
import StoreOrders from './pages/StoreOrders'
import { useAuth } from './contexts/AuthContext'

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      <Routes>
        {/* Rotas públicas da loja */}
        <Route path="/loja"         element={<Store />} />
        <Route path="/loja/entrar"  element={<StoreLogin />} />
        <Route path="/loja/perfil"  element={<StoreProfile />} />
        <Route path="/loja/pedidos" element={<StoreOrders />} />

        {/* Login admin */}
        <Route path="/login" element={<Login />} />

        {/* Rotas protegidas (admin) */}
        <Route path="/"                    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/produtos/novo"       element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
        <Route path="/produtos/:id/editar" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
        <Route path="/vender"              element={<ProtectedRoute><NewSale /></ProtectedRoute>} />
        <Route path="/faturamento"         element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
        <Route path="/trocar-senha"        element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/clientes"            element={<ProtectedRoute><Clients /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to={user ? '/' : '/loja'} />} />
      </Routes>
      {user && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreAuthProvider>
          <AppRoutes />
        </StoreAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
