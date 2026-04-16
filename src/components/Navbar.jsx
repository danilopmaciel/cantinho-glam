import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Sparkles, LogOut, Lock, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const handleLogout = async () => {
    setMenuOpen(false)
    await signOut()
    navigate('/login')
  }

  const handleChangePassword = () => {
    setMenuOpen(false)
    navigate('/trocar-senha')
  }

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-rose-500" />
          </div>
          <span className="font-bold text-gray-800 text-lg">Cantinho Glam</span>
        </div>

        {/* Menu do usuário */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-full pl-1.5 pr-3 py-1.5 transition-colors"
          >
            {/* Avatar com inicial */}
            <div className="w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <span className="hidden sm:block text-sm text-gray-600 truncate max-w-[140px]">
              {user?.email}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-30">
              {/* Header do dropdown */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400 mb-0.5">Logado como</p>
                <p className="text-sm font-semibold text-gray-700 truncate">{user?.email}</p>
              </div>

              {/* Opções */}
              <div className="py-1.5">
                <button
                  onClick={handleChangePassword}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors text-left"
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  Trocar senha
                </button>

                <div className="border-t border-gray-100 my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
