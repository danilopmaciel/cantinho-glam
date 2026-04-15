import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Sparkles, LogOut, User } from 'lucide-react'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-rose-500" />
          </div>
          <span className="font-bold text-gray-800 text-lg">Cantinho Glam</span>
        </div>

        {/* User info + logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">
            <User className="w-3.5 h-3.5" />
            <span className="truncate max-w-[160px]">{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  )
}
