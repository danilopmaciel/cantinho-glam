import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Users, Plus, Search, Pencil, Trash2, X, Save,
  Phone, MapPin, FileText, User, ExternalLink, ChevronDown
} from 'lucide-react'

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
                    <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3 shrink-0" /> {client.phone}
                    </p>
                  </div>
                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    {(client.cpf_cnpj || client.address || client.number || client.complement || client.maps_link || client.notes) && (
                      <button onClick={() => setExpandedId(expandedId === client.id ? null : client.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === client.id ? 'rotate-180' : ''}`} />
                      </button>
                    )}
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
                      <p className="flex items-start gap-2 text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span>
                          {client.address}
                          {client.number     ? `, nº ${client.number}`        : ''}
                          {client.complement ? ` — ${client.complement}`      : ''}
                          {client.cep        ? ` · CEP ${client.cep}`         : ''}
                        </span>
                      </p>
                    )}
                    {client.maps_link && (
                      <a href={client.maps_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-rose-500 hover:underline font-medium">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Ver no Google Maps
                      </a>
                    )}
                    {client.notes && (
                      <p className="flex items-start gap-2 text-gray-500 italic">
                        <span className="shrink-0">📝</span> {client.notes}
                      </p>
                    )}
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
