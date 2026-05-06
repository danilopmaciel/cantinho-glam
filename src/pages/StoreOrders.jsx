import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStoreAuth } from '../contexts/StoreAuthContext'
import { ArrowLeft, ShoppingBag, ChevronDown, ChevronUp, Package } from 'lucide-react'

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const fmtDate = (d) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

export default function StoreOrders() {
  const { user, loading } = useStoreAuth()
  const navigate = useNavigate()

  const [orders, setOrders]           = useState([])
  const [fetching, setFetching]       = useState(true)
  const [expandedId, setExpandedId]   = useState(null)

  useEffect(() => {
    if (!loading && !user) navigate('/loja/entrar')
  }, [user, loading, navigate])

  useEffect(() => {
    if (user) fetchOrders()
  }, [user])

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('store_orders')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setFetching(false)
  }

  if (loading || fetching) {
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
        <Link to="/loja/perfil" className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-gray-900 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-rose-400" />
          Meus pedidos
        </h1>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <ShoppingBag className="w-12 h-12 text-rose-200 mx-auto" />
            <p className="text-gray-400 text-sm">Você ainda não fez nenhum pedido.</p>
            <Link to="/loja"
              className="inline-block bg-rose-500 text-white font-semibold px-5 py-2.5 rounded-2xl text-sm hover:bg-rose-600 transition-colors">
              Ver produtos
            </Link>
          </div>
        ) : (
          orders.map(order => {
            const items   = order.items || []
            const isOpen  = expandedId === order.id
            const count   = items.reduce((s, i) => s + (i.qty || 1), 0)
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-xs text-gray-400">{fmtDate(order.created_at)}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {count} {count === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-rose-500">{fmt(order.total)}</span>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-rose-50 px-4 pb-4 pt-3 space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-rose-50 rounded-xl p-2.5">
                        <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-rose-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                          {item.color && <p className="text-xs text-gray-400">{item.color}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500">x{item.qty}</p>
                          <p className="text-sm font-bold text-rose-500">{fmt((item.price || 0) * (item.qty || 1))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
