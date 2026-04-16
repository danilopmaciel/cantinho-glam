import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingBag, Tag, ArrowLeft, Save, Percent } from 'lucide-react'
import Navbar from '../components/Navbar'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function NewSale() {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [products, setProducts]       = useState([])
  const [selected, setSelected]       = useState(null)
  const [quantity, setQuantity]       = useState('')
  const [discount, setDiscount]       = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('brand')
    setProducts(data || [])
  }

  const handleSelectProduct = (id) => {
    const p = products.find(p => p.id === id)
    setSelected(p || null)
    setQuantity('')
    setDiscount('')
    setError('')
  }

  // Cálculos em tempo real
  const unitPrice     = selected ? parseFloat(selected.sale_price) : 0
  const qty           = parseInt(quantity) || 0
  const discountPct   = parseFloat(discount) || 0
  const grossTotal    = unitPrice * qty
  const discountAmt   = grossTotal * (discountPct / 100)
  const netTotal      = grossTotal - discountAmt

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!selected)       return setError('Selecione um produto.')
    if (qty <= 0)        return setError('Informe a quantidade vendida.')
    if (qty > (selected.quantity ?? 0))
      return setError(`Estoque insuficiente. Disponível: ${selected.quantity ?? 0} un.`)

    setSaving(true)
    try {
      // Registrar venda
      const { error: saleErr } = await supabase.from('sales').insert([{
        product_id:       selected.id,
        user_id:          user.id,
        quantity_sold:    qty,
        unit_price:       unitPrice,
        discount_percent: discountPct,
        discount_amount:  discountAmt,
        total_price:      netTotal,
      }])
      if (saleErr) throw saleErr

      // Baixar estoque
      const { error: stockErr } = await supabase
        .from('products')
        .update({ quantity: (selected.quantity ?? 0) - qty })
        .eq('id', selected.id)
      if (stockErr) throw stockErr

      setSuccess(true)
      setTimeout(() => {
        setSelected(null); setQuantity(''); setDiscount(''); setSuccess(false)
        fetchProducts()
      }, 2000)
    } catch (err) {
      setError(err.message || 'Erro ao registrar venda.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-xl">Registrar Venda</h1>
            <p className="text-sm text-gray-400">Registrado por: {user?.email}</p>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-bold text-green-800">Venda registrada!</p>
              <p className="text-sm text-green-600">Estoque atualizado automaticamente.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Seleção de produto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Produto <span className="text-rose-500">*</span>
            </label>
            <select
              value={selected?.id || ''}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 appearance-none"
            >
              <option value="">Selecione um produto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                  {p.brand} — {p.type}{p.color ? ` (${p.color})` : ''}
                  {p.quantity === 0 ? ' — SEM ESTOQUE' : ` — ${p.quantity} un.`}
                </option>
              ))}
            </select>
          </div>

          {/* Card do produto selecionado */}
          {selected && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4 items-center">
              {selected.image_url
                ? <img src={selected.image_url} alt="" className="w-16 h-16 object-cover rounded-xl" />
                : <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center">
                    <Tag className="w-6 h-6 text-rose-300" />
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800">{selected.brand}</p>
                <p className="text-sm text-gray-500">{selected.type}{selected.color ? ` · ${selected.color}` : ''}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-rose-600 font-bold">{fmt(selected.sale_price)}</span>
                  <span className="text-xs text-gray-400">Estoque: {selected.quantity ?? 0} un.</span>
                </div>
              </div>
            </div>
          )}

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Quantidade vendida <span className="text-rose-500">*</span>
            </label>
            <input
              type="number" value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1" max={selected?.quantity ?? 999} step="1" placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
            />
          </div>

          {/* Desconto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Desconto (%)
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number" value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                min="0" max="100" step="0.1" placeholder="0"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
            </div>
          </div>

          {/* Resumo financeiro */}
          {selected && qty > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
              <h3 className="font-bold text-gray-700 text-sm mb-3">Resumo da venda</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{qty} × {fmt(unitPrice)}</span>
                <span className="font-medium">{fmt(grossTotal)}</span>
              </div>
              {discountPct > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-orange-500">Desconto ({discountPct}%)</span>
                  <span className="text-orange-500 font-medium">− {fmt(discountAmt)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-bold text-gray-800">Total</span>
                <span className="font-bold text-rose-600 text-lg">{fmt(netTotal)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={saving || !selected || qty <= 0}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-200">
            {saving
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Save className="w-5 h-5" /> Confirmar Venda</>}
          </button>
        </form>
      </div>
    </div>
  )
}
