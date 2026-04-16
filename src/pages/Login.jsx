import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Sparkles, LogIn, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      navigate('/')
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'Email not confirmed':        'Confirme seu e-mail antes de entrar.',
        'Too many requests':          'Muitas tentativas. Aguarde alguns minutos.',
      }
      setError(msgs[err.message] || 'Erro ao entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cantinho Glam</h1>
          <p className="text-gray-400 text-sm mt-1">Área restrita — acesso autorizado</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="seu@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><LogIn className="w-4 h-4" /> Entrar</>}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Não tem acesso? Solicite ao administrador.
        </p>
      </div>
    </div>
  )
}
