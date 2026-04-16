import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  TrendingUp, ShoppingBag, Tag, Users, Calendar,
  ChevronDown, ChevronUp, User, Phone
} from 'lucide-react'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

const FILTERS = [
  { label: 'Hoje',   days: 0  },
  { label: 'Semana', days: 7  },
  { label: 'Mês',    days: 30 },
  { label: 'Tudo',   days: -1 },
]

export default function Revenue() {
  const [sales, setSales]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState(2)
  const [expandedOrders, setExpandedOrders] = useState({})

  useEffect(() => { fetchSales() }, [filter])

  const fetchSales = async () => {
    setLoading(true)
    let query = supabase
      .from('sales')
      .select(`
        id, order_id, created_at,
        seller_email, user_id,
        customer_name, customer_phone, customer_id,
        quantity_sold, unit_price,
        discount_percent, discount_amount, total_price,
        products ( id, name, brand, type, color, image_url )
      `)
      .order('created_at', { ascending: false })

    const days = FILTERS[filter].days
    if (days >= 0) {
      const from = new Date()
      from.setDate(from.getDate() - days)
      from.setHours(0, 0, 0, 0)
      query = query.gte('created_at', from.toISOString())
    }

    const { data, error } = await query
    if (error) console.error('Revenue query error:', error)
    setSales(data || [])
    setLoading(false)
  }

  // ── Agrupamento por pedido ────────────────────────────────

  const orders = Object.values(
    (sales || []).reduce((acc, sale) => {
      // Cada order_id é um pedido; se não tiver order_id, trata cada venda como pedido individual
      const key = sale.order_id || `single-${sale.id}`
      if (!acc[key]) {
        acc[key] = {
          key,
          order_id:      sale.order_id,
          created_at:    sale.created_at,
          seller_email:  sale.seller_email || '—',
          customer_name: sale.customer_name || null,
          customer_phone:sale.customer_phone || null,
          items:         [],
          gross:         0,
          discount:      0,
          total:         0,
          units:         0,
        }
      }
      acc[key].items.push(sale)
      acc[key].gross    += (sale.unit_price || 0) * (sale.quantity_sold || 0)
      acc[key].discount += sale.discount_amount || 0
      acc[key].total    += sale.total_price || 0
      acc[key].units    += sale.quantity_sold || 0
      return acc
    }, {})
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  // ── Totais gerais ─────────────────────────────────────────

  const totalOrders   = orders.length
  const totalUnits    = orders.reduce((s, o) => s + o.units, 0)
  const grossRevenue  = orders.reduce((s, o) => s + o.gross, 0)
  const totalDiscount = orders.reduce((s, o) => s + o.discount, 0)
  const netRevenue    = orders.reduce((s, o) => s + o.total, 0)

  // ── Ranking de produtos ───────────────────────────────────

  const byProduct = Object.values(
    sales.reduce((acc, s) => {
      const key  = s.product_id || 'removed'
      const name = s.products?.name || s.products?.brand
        ? `${s.products.name || s.products.brand}${s.products.type ? ' ' + s.products.type : ''}`
        : 'Produto removido'
      if (!acc[key]) acc[key] = { name, units: 0, revenue: 0 }
      acc[key].units   += s.quantity_sold || 0
      acc[key].revenue += s.total_price   || 0
      return acc
    }, {})
  ).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // ── Ranking de vendedores ─────────────────────────────────

  const bySeller = Object.values(
    orders.reduce((acc, o) => {
      const email = o.seller_email || '—'
      if (!acc[email]) acc[email] = { email, orders: 0, revenue: 0 }
      acc[email].orders  += 1
      acc[email].revenue += o.total
      return acc
    }, {})
  ).sort((a, b) => b.revenue - a.revenue)

  const toggleOrder = (key) =>
    setExpandedOrders(prev => ({ ...prev, [key]: !prev[key] }))

  const productName = (sale) => {
    if (!sale.products) return 'Produto removido'
    const p = sale.products
    return [p.name || p.brand, p.color].filter(Boolean).join(' · ')
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-rose-500" />
          </div>
          <h1 className="font-bold text-gray-900 text-lg">Faturamento</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5">

        {/* Filtro de período */}
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 mb-5 w-fit shadow-sm">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <StatCard label="Pedidos"    value={totalOrders}    icon={<ShoppingBag className="w-4 h-4" />} color="bg-blue-50 text-blue-600" />
              <StatCard label="Unidades"   value={totalUnits}     icon={<Tag className="w-4 h-4" />}        color="bg-purple-50 text-purple-600" />
              <StatCard label="Fat. Bruto" value={fmt(grossRevenue)} icon={<TrendingUp className="w-4 h-4" />} color="bg-green-50 text-green-600" />
              <StatCard label="Fat. Líquido" value={fmt(netRevenue)} icon={<TrendingUp className="w-4 h-4" />} color="bg-rose-50 text-rose-600" highlight />
            </div>

            {totalDiscount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex justify-between items-center mb-5">
                <span className="text-orange-700 text-sm font-medium">Total em descontos</span>
                <span className="text-orange-700 font-bold">− {fmt(totalDiscount)}</span>
              </div>
            )}

            {orders.length === 0 ? (
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
                          <span className="w-6 h-6 bg-rose-100 text-rose-600 rounded-full text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
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
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.email}</p>
                            <p className="text-xs text-gray-400">{s.orders} pedido{s.orders !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="font-bold text-gray-800 shrink-0">{fmt(s.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico de pedidos */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-rose-500" /> Histórico de Pedidos
                    </h2>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {orders.map(order => (
                      <div key={order.key}>
                        {/* Cabeçalho do pedido */}
                        <button
                          onClick={() => toggleOrder(order.key)}
                          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left">

                          {/* Data */}
                          <div className="shrink-0 text-center">
                            <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                            <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>

                          <div className="flex-1 min-w-0 space-y-0.5">
                            {/* Cliente */}
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="text-sm font-semibold text-gray-800 truncate">
                                {order.customer_name || <span className="text-gray-400 font-normal italic">Sem cliente</span>}
                              </span>
                              {order.customer_phone && (
                                <span className="text-xs text-gray-400 shrink-0">· {order.customer_phone}</span>
                              )}
                            </div>
                            {/* Vendedor */}
                            <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                              <Users className="w-3 h-3 shrink-0" />
                              {order.seller_email}
                              <span className="mx-1">·</span>
                              {order.units} un.
                            </p>
                          </div>

                          {/* Total + expand */}
                          <div className="shrink-0 flex items-center gap-2">
                            <div className="text-right">
                              <p className="font-bold text-rose-600">{fmt(order.total)}</p>
                              {order.discount > 0 && (
                                <p className="text-xs text-orange-400">−{fmt(order.discount)}</p>
                              )}
                            </div>
                            {expandedOrders[order.key]
                              ? <ChevronUp className="w-4 h-4 text-gray-400" />
                              : <ChevronDown className="w-4 h-4 text-gray-400" />
                            }
                          </div>
                        </button>

                        {/* Itens do pedido (expandível) */}
                        {expandedOrders[order.key] && (
                          <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 space-y-2">
                            {order.items.map(item => (
                              <div key={item.id} className="flex items-center gap-3">
                                {item.products?.image_url
                                  ? <img src={item.products.image_url} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                                  : <div className="w-9 h-9 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                                      <Tag className="w-3.5 h-3.5 text-rose-300" />
                                    </div>
                                }
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{productName(item)}</p>
                                  <p className="text-xs text-gray-400">
                                    {item.quantity_sold} × {fmt(item.unit_price)}
                                    {item.discount_percent > 0 && ` · ${item.discount_percent}% off`}
                                  </p>
                                </div>
                                <p className="font-bold text-gray-800 shrink-0">{fmt(item.total_price)}</p>
                              </div>
                            ))}

                            {/* Sub-resumo do pedido */}
                            <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-sm">
                              <span className="text-gray-500">Total do pedido</span>
                              <span className="font-bold text-rose-600">{fmt(order.total)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
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
