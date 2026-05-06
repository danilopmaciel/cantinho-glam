import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin]   = useState(null)

  useEffect(() => {
    if (!user) { setIsAdmin(false); return }
    // Usuários com perfil na tabela profiles são clientes, não admins
    supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(!data))
  }, [user])

  if (loading || (user && isAdmin === null)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !isAdmin) return <Navigate to="/loja" replace />
  return children
}
