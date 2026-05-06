import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStoreAuth } from '../contexts/StoreAuthContext'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export default function StoreLogin() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useStoreAuth()
  const navigate = useNavigate()

  const [mode, setMode]         = useState('login') // 'login' | 'signup'
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')

  const handleGoogle = async () => {
    setError('')
    await signInWithGoogle()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
        navigate('/loja')
      } else {
        if (!name.trim()) throw new Error('Informe seu nome.')
        if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.')
        const { error } = await signUpWithEmail(email, password, name.trim())
        if (error) throw error
        setInfo('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      }
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4">
        <Link to="/loja" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar à loja
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="text-center mb-8">
            <p className="text-3xl mb-2">✨</p>
            <h1 className="font-black text-rose-500 text-2xl">Cantinho Glam</h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-rose-100 border border-rose-100 p-6 space-y-4">

            {/* Google */}
            <button onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-rose-300 hover:bg-rose-50 text-gray-700 font-semibold py-3 rounded-2xl transition-all text-sm">
              <GoogleIcon />
              Continuar com Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">ou</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
                  required
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  ⚠️ {error}
                </p>
              )}
              {info && (
                <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                  ✅ {info}
                </p>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-lg shadow-rose-200 mt-1">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  : mode === 'login' ? 'Entrar' : 'Criar conta'
                }
              </button>
            </form>

            <p className="text-center text-sm text-gray-500">
              {mode === 'login' ? (
                <>Não tem conta?{' '}
                  <button onClick={() => { setMode('signup'); setError('') }}
                    className="text-rose-500 font-semibold hover:underline">
                    Criar conta
                  </button>
                </>
              ) : (
                <>Já tem conta?{' '}
                  <button onClick={() => { setMode('login'); setError('') }}
                    className="text-rose-500 font-semibold hover:underline">
                    Entrar
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
