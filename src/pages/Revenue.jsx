import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TrendingUp, ShoppingBag, Tag, Users, Calendar, ChevronDown } from 'lucide-react'
import Navbar from '../components/Navbar'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

const FILTERS = [
  { label: 'Hoje',      days: 0 },
  { label: 'Semana',    days: 7 },
  { label: 'Mês',       days: 30 },
  { label: 'Tudo',      days: -1 },
]

export default function Revenue() {
  const [sales, setSales]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState(2)   // default: Mês

  useEffect(() => { fetchSales() }, [filter])

  const fetchSales = async () => {
    setLoading(true)
    let query = supabase
      .from('sales')
      .select(`
        *,
        products ( brand, type, color, image_url ),
        profiles ( email )
      `)
      .order('created_at', { ascending: false })

    const days = FILTERS[filter].days
    if (days >= 0) {
      const from = new Date()
      from.setDate(from.getDate() - days)
      from.setHours(0, 0, 0, 0)
      query = query.gte('created_at', from.toISOString())
    }

    const { data } = await query
    setSales(data || [])
    setLoading(false)
  }

  // Totais
  const totalSales    = sales.length
  const totalUnits    = sales.reduce((s, v) => s + (v.quantity_sold || 0), 0)
  const grossRevenue  = sales.reduce((s, v) => s + (v.unit_price * v.quantity_sold), 0)
  const totalDiscount = sales.reduce((s, v) => s + (v.discount_amount || 0), 0)
  const netRevenue    = sales.reduce((s, v) => s + (v.total_price || 0), 0)

  // Ranking de produtos
  const byProduct = Object.values(
    sales.reduce((acc, v) => {
      const key = v.product_id
      if (!acc[key]) acc[key] = {
        name: v.products ? `${v.products.brand} ${v.products.type}` : 'Produto removido',
        units: 0, revenue: 0,
      }
      acc[key].units   += v.quantity_sold
      acc[key].revenue += v.total_price
      return acc
    }, {})
  ).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Ranking de vendedores
  const bySeller = Object.values(
    sales.reduce((acc, v) => {
      const email = v.profiles?.email || v.user_id || 'Desconhecido'
      if (!acc[email]) acc[email] = { email, sales: 0, revenue: 0 }
      acc[email].sales   += 1
      acc[email].revenue += v.total_price
      return acc
    }, {})
  ).sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Título */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-rose-500" />
          </div>
          <h1 className="font-bold text-gray-900 text-xl">Faturamento</h1>
        </div>

        {/* Filtro de período */}
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit shadow-sm">
          {FILTERS.map((f, i) => (
            <button key={i} onClick={() => setFilter(i)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === i ? 'bg-rose-500 text-white shadow' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard label="Vendas" value={totalSales} icon={<ShoppingBag className="w-4 h-4" />} unit="" color="bg-blue-50 text-blue-600" />
              <StatCard label="Unidades" value={totalUnits} icon={<Tag className="w-4 h-4" />} unit="" color="bg-purple-50 text-purple-600" />
              <StatCard label="Faturamento Bruto" value={fmt(grossRevenue)} icon={<TrendingUp className="w-4 h-4" />} color="bg-green-50 text-green-600" />
              <StatCard label="Faturamento Líquido" value={fmt(netRevenue)} icon={<TrendingUp className="w-4 h-4" />} color="bg-rose-50 text-rose-600" highlight />
            </div>

            {totalDiscount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex justify-between items-center mb-6">
                <span className="text-orange-700 text-sm font-medium">Total em descontos concedidos</span>
                <span className="text-orange-700 font-bold">− {fmt(totalDiscount)}</span>
              </div>
            )}

            {sales.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma venda no período selecionado.</p>
              </div>
            ) : (
              <div className="space-y-6">

                {/* Ranking de produtos */}
                {byProduct.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-rose-500" /> Top Produtos
                    </h2>
                    <div className="space-y-3">
                      {byProduct.map((p, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-rose-100 text-rose-600 rounded-full text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.units} unidades</p>
                          </div>
                          <span className="font-bold text-gray-800 shrink-0">{fmt(p.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ranking de vendedores */}
                {bySeller.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-rose-500" /> Vendedores
                    </h2>
                    <div className="space-y-3">
                      {bySeller.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.email}</p>
                            <p className="text-xs text-gray-400">{s.sales} venda{s.sales !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="font-bold text-gray-800 shrink-0">{fmt(s.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabela detalhada */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-rose-500" /> Histórico de Vendas
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Produto</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendedor</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Qtd</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Unit.</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Desconto</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Total</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sales.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {s.products ? `${s.products.brand} ${s.products.type}` : '—'}
                              {s.products?.color && <span className="text-gray-400"> · {s.products.color}</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">
                              {s.profiles?.email || '—'}
                            </td>
                            <td className="px-4 py-3 text-center font-medium">{s.quantity_sold}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{fmt(s.unit_price)}</td>
                            <td className="px-4 py-3 text-right">
                              {s.discount_percent > 0
                                ? <span className="text-orange-500">−{fmt(s.discount_amount)}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-rose-600">{fmt(s.total_price)}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmtDate(s.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, highlight }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 ${highlight ? 'border-rose-200 shadow-sm shadow-rose-100' : 'border-gray-100'}`}>
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${color}`}>
        {icon}
      </div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`font-bold text-lg mt-0.5 ${highlight ? 'text-rose-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
