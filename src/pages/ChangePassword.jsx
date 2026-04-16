import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function ChangePassword() {
  const navigate  = useNavigate()
  const { user }  = useAuth()

  const [form, setForm] = useState({
    newPassword:     '',
    confirmPassword: '',
  })
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.newPassword)
      return setError('Informe a nova senha.')
    if (form.newPassword.length < 6)
      return setError('A senha deve ter pelo menos 6 caracteres.')
    if (form.newPassword !== form.confirmPassword)
      return setError('As senhas não coincidem.')

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: form.newPassword,
      })
      if (error) throw error
      setSuccess(true)
      setForm({ newPassword: '', confirmPassword: '' })
    } catch (err) {
      setError(err.message || 'Erro ao atualizar senha. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button type="button" onClick={() => navigate(-1)}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-rose-400" />
          <h1 className="font-bold text-gray-900 text-lg">Trocar Senha</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        {/* Info do usuário */}
        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-rose-600 font-bold text-sm">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Conta</p>
            <p className="font-semibold text-gray-800 truncate">{user?.email}</p>
          </div>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-green-800 text-lg">Senha atualizada!</p>
              <p className="text-sm text-green-600 mt-1">Sua nova senha já está ativa.</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
              Voltar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nova senha */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nova senha <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={(e) => handleChange('newPassword', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Barra de força da senha */}
              {form.newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map(level => {
                      const strength = getStrength(form.newPassword)
                      return (
                        <div key={level}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            level <= strength
                              ? strength <= 1 ? 'bg-red-400'
                              : strength === 2 ? 'bg-yellow-400'
                              : strength === 3 ? 'bg-blue-400'
                              : 'bg-green-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-400">
                    {['', 'Senha fraca', 'Razoável', 'Boa', 'Forte'][getStrength(form.newPassword)]}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirmar nova senha <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                  className={`w-full border rounded-xl px-4 py-3 pr-11 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 bg-white transition-colors ${
                    form.confirmPassword && form.newPassword !== form.confirmPassword
                      ? 'border-red-300 focus:ring-red-300'
                      : form.confirmPassword && form.newPassword === form.confirmPassword
                        ? 'border-green-300 focus:ring-green-300'
                        : 'border-gray-200 focus:ring-rose-400'
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
              )}
              {form.confirmPassword && form.newPassword === form.confirmPassword && (
                <p className="text-xs text-green-600 mt-1">✓ Senhas coincidem.</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm flex items-start gap-2">
                <span className="mt-0.5">⚠️</span><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-rose-200 mt-2">
              {saving
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Lock className="w-5 h-5" /> Atualizar Senha</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function getStrength(password) {
  let score = 0
  if (password.length >= 6)  score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}
