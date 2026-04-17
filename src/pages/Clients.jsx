import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Users, Plus, Search, Pencil, Trash2, X, Save,
  Phone, MapPin, FileText, User, ExternalLink, ChevronDown, Navigation,
  ShoppingBag, Tag
} from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

// Abre WhatsApp com o número do cliente
const whatsappUrl = (phone) => {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${number}`
}

// URL de navegação Google Maps — usa o link salvo ou monta pelo endereço
// O ViaCEP preenche address como "Logradouro, Bairro, Cidade, UF"
// A URL precisa ser: "Logradouro, Número, Cidade, UF, CEP"
const mapsNavUrl = (client) => {
  if (client.maps_link) return client.maps_link

  const parts = (client.address || '').split(',').map(p => p.trim()).filter(Boolean)
  // parts[0] = logradouro, parts[1] = bairro, parts[2] = cidade, parts[3] = UF
  const street = parts[0] || ''
  const city   = parts.length >= 4 ? parts[2] : (parts.length >= 2 ? parts[parts.length - 1] : '')
  const state  = parts.length >= 4 ? parts[3] : ''

  const query = [street, client.number, city, state, client.cep]
    .filter(Boolean).join(', ')

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`
}

const emptyForm = {
  name: '', phone: '', cpf_cnpj: '',
  cep: '', address: '', number: '', complement: '', maps_link: '', notes: '',
}

const fmtPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) => c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : `(${a}`)
}

const fmtCep = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d{0,3})/, (_, a, b) => b ? `${a}-${b}` : a)
}

export default function Clients() {
  const [searchParams] = useSearchParams()
  const [clients, setClients]     = useState([])
  const [filtered, setFiltered]   = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [error, setError]         = useState('')
  const [deleteId, setDeleteId]   = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [clientHistory, setClientHistory] = useState({}) // { [clientId]: { loading, orders } }

  // Pré-preenche busca se vier da aba Faturamento via ?q=
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearch(q)
  }, [])

  useEffect(() => { fetchClients() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      clients.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.cpf_cnpj?.includes(q)
      )
    )
  }, [search, clients])

  const fetchClients = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name')
    setClients(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  // ── Histórico de compras do cliente ──────────────────────
  const loadHistory = useCallback(async (clientId) => {
    setClientHistory(prev => ({ ...prev, [clientId]: { loading: true, orders: [] } }))
    const { data } = await supabase
      .from('sales')
      .select('id, order_id, created_at, quantity_sold, unit_price, total_price, discount_amount, products(id, name, brand, color)')
      .eq('customer_id', clientId)
      .eq('cancelled', false)
      .order('created_at', { ascending: false })
      .limit(30)

    // Agrupar por order_id
    const grouped = Object.values(
      (data || []).reduce((acc, s) => {
        const key = s.order_id || `s-${s.id}`
        if (!acc[key]) acc[key] = { key, created_at: s.created_at, items: [], total: 0 }
        acc[key].items.push(s)
        acc[key].total += s.total_price || 0
        return acc
      }, {})
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setClientHistory(prev => ({ ...prev, [clientId]: { loading: false, orders: grouped } }))
  }, [])

  const toggleExpand = (clientId) => {
    const isOpening = expandedId !== clientId
    setExpandedId(isOpening ? clientId : null)
    if (isOpening && !clientHistory[clientId]) loadHistory(clientId)
  }

  const openNew = () => {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setShowModal(true)
  }

  const openEdit = (client) => {
    setForm({
      name:      client.name || '',
      phone:     client.phone || '',
      cpf_cnpj:  client.cpf_cnpj || '',
      cep:        client.cep        || '',
      address:    client.address    || '',
      number:     client.number     || '',
      complement: client.complement || '',
      maps_link:  client.maps_link  || '',
      notes:     client.notes || '',
    })
    setEditingId(client.id)
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  // ── Busca de CEP via ViaCEP ────────────────────────────────
  const fetchCep = async (rawCep) => {
    const cep = rawCep.replace(/\D/g, '')
    if (cep.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        const addr = [data.logradouro, data.bairro, data.localidade, data.uf]
          .filter(Boolean).join(', ')
        setForm(prev => ({ ...prev, address: addr }))
      }
    } catch (_) {}
    finally { setCepLoading(false) }
  }

  // ── Salvar ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim())  return setError('Informe o nome do cliente.')
    if (!form.phone.trim()) return setError('Informe o telefone do cliente.')

    setSaving(true)
    try {
      const payload = {
        name:      form.name.trim(),
        phone:     form.phone.trim(),
        cpf_cnpj:   form.cpf_cnpj.trim()   || null,
        cep:        form.cep.trim()        || null,
        address:    form.address.trim()    || null,
        number:     form.number.trim()     || null,
        complement: form.complement.trim() || null,
        maps_link:  form.maps_link.trim()  || null,
        notes:     form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (editingId) {
        const { error } = await supabase.from('customers').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('customers').insert([payload])
        if (error) throw error
      }

      await fetchClients()
      closeModal()
    } catch (err) {
      setError(err.message || 'Erro ao salvar cliente.')
    } finally {
      setSaving(false)
    }
  }

  // ── Deletar ───────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteId) return
    await supabase.from('customers').delete().eq('id', deleteId)
    setDeleteId(null)
    fetchClients()
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-400" />
            <h1 className="font-bold text-gray-900 text-lg">Clientes</h1>
            <span className="text-xs text-gray-400 font-normal ml-1">({clients.length})</span>
          </div>
          <button onClick={openNew}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-colors shadow-sm shadow-rose-200">
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou CPF..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-9 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
            </p>
            {!search && (
              <button onClick={openNew}
                className="mt-4 text-rose-500 font-semibold text-sm hover:underline">
                Cadastrar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(client => (
              <div key={client.id}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                {/* Linha principal */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-rose-600 font-bold text-sm">
                      {client.name[0]?.toUpperCase()}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{client.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                        <Phone className="w-3 h-3 shrink-0" /> {client.phone}
                      </p>
                      {client.phone && (
                        <a href={whatsappUrl(client.phone)} target="_blank" rel="noopener noreferrer"
                          title="Abrir no WhatsApp"
                          className="shrink-0 flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors">
                          {/* Ícone WhatsApp SVG */}
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleExpand(client.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === client.id ? 'rotate-180' : ''}`} />
                    </button>
                    <button onClick={() => openEdit(client)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(client.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {expandedId === client.id && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2 text-sm">
                    {client.cpf_cnpj && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-500">CPF/CNPJ:</span> {client.cpf_cnpj}
                      </p>
                    )}
                    {(client.address || client.number) && (
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex items-start gap-2 text-gray-600 flex-1 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span>
                            {client.address}
                            {client.number     ? `, nº ${client.number}`   : ''}
                            {client.complement ? ` — ${client.complement}` : ''}
                            {client.cep        ? ` · CEP ${client.cep}`    : ''}
                          </span>
                        </p>
                        <a href={mapsNavUrl(client)} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap">
                          <Navigation className="w-3.5 h-3.5" /> Navegue até
                        </a>
                      </div>
                    )}
                    {!client.address && !client.number && client.maps_link && (
                      <a href={client.maps_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors w-fit">
                        <Navigation className="w-3.5 h-3.5" /> Navegue até
                      </a>
                    )}
                    {client.notes && (
                      <p className="flex items-start gap-2 text-gray-500 italic">
                        <span className="shrink-0">📝</span> {client.notes}
                      </p>
                    )}

                    {/* ── Histórico de compras ── */}
                    <div className="pt-2 border-t border-gray-200 mt-1">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        <ShoppingBag className="w-3.5 h-3.5" /> Histórico de compras
                      </p>
                      {clientHistory[client.id]?.loading ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                          <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                          Carregando...
                        </div>
                      ) : clientHistory[client.id]?.orders.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-1">Nenhuma compra registrada.</p>
                      ) : (
                        <div className="space-y-2">
                          {clientHistory[client.id].orders.map(order => (
                            <div key={order.key} className="bg-white border border-gray-100 rounded-xl px-3 py-2 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">{fmtDate(order.created_at)}</span>
                                <span className="text-sm font-bold text-rose-600">{fmt(order.total)}</span>
                              </div>
                              <div className="space-y-0.5">
                                {order.items.map(item => (
                                  <p key={item.id} className="text-xs text-gray-500 flex items-center gap-1.5">
                                    <Tag className="w-3 h-3 text-gray-300 shrink-0" />
                                    {item.products?.name || item.products?.brand || 'Produto removido'}
                                    {item.products?.color ? ` · ${item.products.color}` : ''}
                                    <span className="text-gray-400">× {item.quantity_sold}</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal de cadastro/edição ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl sm:rounded-t-3xl z-10">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-rose-400" />
                <h2 className="font-bold text-gray-900">
                  {editingId ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
              </div>
              <button onClick={closeModal}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nome <span className="text-rose-500">*</span>
                </label>
                <input type="text" value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="Nome completo"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-sm" />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Telefone <span className="text-rose-500">*</span>
                </label>
                <input type="tel" value={form.phone}
                  onChange={e => handleChange('phone', fmtPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-sm" />
              </div>

              {/* CPF/CNPJ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">CPF / CNPJ</label>
                <input type="text" value={form.cpf_cnpj}
                  onChange={e => handleChange('cpf_cnpj', e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-sm" />
              </div>

              {/* CEP */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">CEP</label>
                <div className="relative">
                  <input type="text" value={form.cep}
                    onChange={e => {
                      const v = fmtCep(e.target.value)
                      handleChange('cep', v)
                      if (v.replace(/\D/g, '').length === 8) fetchCep(v)
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-sm" />
                  {cepLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">O endereço é preenchido automaticamente pelo CEP.</p>
              </div>

              {/* Endereço + Número */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Endereço</label>
                <div className="flex gap-2">
                  <input type="text" value={form.address}
                    onChange={e => handleChange('address', e.target.value)}
                    placeholder="Rua, bairro, cidade..."
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-sm" />
                  <input type="text" value={form.number}
                    onChange={e => handleChange('number', e.target.value)}
                    placeholder="Nº"
                    className="w-20 border border-gray-200 rounded-xl px-3 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-sm text-center" />
                </div>
                <input type="text" value={form.complement}
                  onChange={e => handleChange('complement', e.target.value)}
                  placeholder="Complemento (Apto, Bloco, Casa...)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-sm" />
              </div>

              {/* Link Google Maps */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Link Google Maps
                </label>
                <input type="url" value={form.maps_link}
                  onChange={e => handleChange('maps_link', e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-sm" />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Observações</label>
                <textarea value={form.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  rows={2} placeholder="Preferências, alergias, informações adicionais..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-sm resize-none" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm flex gap-2">
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-rose-200">
                {saving
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Save className="w-4 h-4" /> {editingId ? 'Salvar alterações' : 'Cadastrar cliente'}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal de confirmação de exclusão ── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900">Excluir cliente?</h3>
            <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                Cancelar
              </button>
              <button onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
