import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStoreAuth } from '../contexts/StoreAuthContext'
import { ArrowLeft, User, Phone, MapPin, LogOut, ShoppingBag, CheckCircle } from 'lucide-react'

export default function StoreProfile() {
  const { user, profile, saveProfile, signOut, loading } = useStoreAuth()
  const navigate = useNavigate()

  const [name,         setName]         = useState('')
  const [phone,        setPhone]        = useState('')
  const [cep,          setCep]          = useState('')
  const [address,      setAddress]      = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city,         setCity]         = useState('Bauru')
  const [saving,       setSaving]       = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => {
    if (!loading && !user) navigate('/loja/entrar')
  }, [user, loading, navigate])

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setCep(profile.cep || '')
      setAddress(profile.address || '')
      setNeighborhood(profile.neighborhood || '')
      setCity(profile.city || 'Bauru')
    }
  }, [profile])

  const handleCep = async (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 8)
    const formatted = cleaned.length > 5 ? `${cleaned.slice(0, 5)}-${cleaned.slice(5)}` : cleaned
    setCep(formatted)
    if (cleaned.length === 8) {
      try {
        const res  = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setAddress(data.logradouro || '')
          setNeighborhood(data.bairro || '')
          setCity(data.localidade || 'Bauru')
        }
      } catch {}
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const { error } = await saveProfile({
      name, phone, cep, address, neighborhood, city,
      email: user?.email,
    })
    if (error) setError(error.message)
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
    setSaving(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/loja')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-rose-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Link to="/loja" className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-gray-900">Meu perfil</h1>
        <Link to="/loja/pedidos" className="ml-auto flex items-center gap-1.5 text-sm text-rose-500 font-semibold hover:text-rose-600 transition-colors">
          <ShoppingBag className="w-4 h-4" />
          Meus pedidos
        </Link>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">

        {/* Avatar */}
        <div className="flex flex-col items-center py-4">
          <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-200 mb-3">
            <span className="text-white text-3xl font-black">
              {(name || user?.email || 'U')[0]?.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-rose-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <User className="w-4 h-4 text-rose-400" /> Dados pessoais
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Nome completo</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
                Telefone / WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="(14) 99999-9999"
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
                />
              </div>
            </div>
          </div>

          <h2 className="font-bold text-gray-800 flex items-center gap-2 pt-2 border-t border-gray-100">
            <MapPin className="w-4 h-4 text-rose-400" /> Endereço para entrega
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">CEP</label>
              <input
                type="text" value={cep} onChange={e => handleCep(e.target.value)}
                placeholder="00000-000" maxLength={9}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
              />
              <p className="text-xs text-gray-400 mt-1">Preenchido automaticamente pelo CEP</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Rua / Logradouro</label>
              <input
                type="text" value={address} onChange={e => setAddress(e.target.value)}
                placeholder="Rua, número, complemento"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Bairro</label>
                <input
                  type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Cidade</label>
                <input
                  type="text" value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Cidade"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">⚠️ {error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-colors shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
            {saving
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : success
                ? <><CheckCircle className="w-4 h-4" /> Salvo!</>
                : 'Salvar dados'
            }
          </button>
        </form>

        {/* Sair */}
        <button onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-red-400 py-3 transition-colors">
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </div>
    </div>
  )
}
