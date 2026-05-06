import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ShoppingCart, X, Package, MessageCircle } from 'lucide-react'

const WHATSAPP = '5514991116961'
const STORE_NAME = 'Cantinho Glam'

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Store() {
  const [products, setProducts] = useState([])
  const [cart, setCart]         = useState([])
  const [showCart, setShowCart] = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetchProducts()
    const saved = localStorage.getItem('cantinho_cart')
    if (saved) {
      try { setCart(JSON.parse(saved)) } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('cantinho_cart', JSON.stringify(cart))
  }, [cart])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, brand, type, color, size, image_url, sale_price, quantity')
      .order('type')
      .order('name')
    setProducts(data || [])
    setLoading(false)
  }

  const addToCart = (product) => {
    if ((product.quantity ?? 0) <= 0) return
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        if (existing.qty >= product.quantity) return prev
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev
        .map(i => {
          if (i.id !== id) return i
          const newQty = i.qty + delta
          if (newQty <= 0) return null
          if (newQty > i.quantity) return i
          return { ...i, qty: newQty }
        })
        .filter(Boolean)
    )
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))

  const totalItems = cart.reduce((s, i) => s + i.qty, 0)
  const totalPrice = cart.reduce((s, i) => s + i.sale_price * i.qty, 0)

  const handleWhatsApp = () => {
    const lines = cart.map(i => {
      const name  = i.name || i.brand
      const color = i.color ? ` (${i.color})` : ''
      return `• ${name}${color} x${i.qty} — ${fmt(i.sale_price * i.qty)}`
    })
    const text = [
      `🛍️ *Pedido - ${STORE_NAME}*`,
      '',
      ...lines,
      '',
      `💰 *Total: ${fmt(totalPrice)}*`,
      '',
      'Gostaria de finalizar meu pedido! 😊',
    ].join('\n')
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank')
  }

  const grouped = products.reduce((acc, p) => {
    const key = p.type || 'Outros'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h1 className="font-bold text-gray-900 text-lg">{STORE_NAME}</h1>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative p-2 text-gray-600 hover:text-rose-500 transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Catálogo */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-24 text-gray-400 text-sm">Nenhum produto disponível no momento.</div>
        ) : (
          Object.entries(grouped).map(([type, items]) => (
            <section key={type} className="mb-8">
              <h2 className="font-bold text-gray-600 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-5 h-0.5 bg-rose-400 inline-block rounded-full" />
                {type}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {items.map(p => {
                  const inStock = (p.quantity ?? 0) > 0
                  const inCart  = cart.find(i => i.id === p.id)
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Imagem */}
                      <div className="relative aspect-square bg-gray-50">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name || p.brand}
                            className={`w-full h-full object-cover transition-opacity ${!inStock ? 'opacity-60' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-gray-200" />
                          </div>
                        )}
                        {!inStock && (
                          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
                            <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                              Em breve
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
                          {p.name || p.brand}
                        </p>
                        {p.color && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{p.color}</p>
                        )}
                        <p className="text-rose-600 font-bold text-sm mt-1">{fmt(p.sale_price)}</p>

                        {inStock ? (
                          inCart ? (
                            <div className="flex items-center justify-between mt-2 bg-rose-50 rounded-xl px-1 py-0.5">
                              <button
                                onClick={() => updateQty(p.id, -1)}
                                className="w-8 h-8 flex items-center justify-center text-rose-500 font-bold text-lg hover:bg-rose-100 rounded-lg transition-colors"
                              >
                                −
                              </button>
                              <span className="text-sm font-bold text-gray-800">{inCart.qty}</span>
                              <button
                                onClick={() => updateQty(p.id, 1)}
                                className="w-8 h-8 flex items-center justify-center text-rose-500 font-bold text-lg hover:bg-rose-100 rounded-lg transition-colors"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(p)}
                              className="w-full mt-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-bold py-2 rounded-xl transition-colors"
                            >
                              Adicionar
                            </button>
                          )
                        ) : (
                          <div className="mt-2 text-center text-xs text-gray-400 py-2">Indisponível</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
        {/* Rodapé admin */}
        <div className="text-center py-8">
          <Link to="/login" className="text-xs text-gray-300 hover:text-gray-400 transition-colors">
            Área administrativa
          </Link>
        </div>
      </main>

      {/* Botão flutuante do carrinho */}
      {totalItems > 0 && !showCart && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-20 flex justify-center">
          <button
            onClick={() => setShowCart(true)}
            className="w-full max-w-sm flex items-center justify-between bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold py-4 px-5 rounded-2xl shadow-xl shadow-rose-200 transition-colors"
          >
            <span className="bg-rose-600 rounded-lg px-2.5 py-0.5 text-sm tabular-nums">{totalItems}</span>
            <span>Ver carrinho</span>
            <span className="tabular-nums">{fmt(totalPrice)}</span>
          </button>
        </div>
      )}

      {/* Sheet do carrinho */}
      {showCart && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCart(false)}
          />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-rose-400" />
                Carrinho
                {totalItems > 0 && (
                  <span className="text-sm font-normal text-gray-400">· {totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
                )}
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Itens */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-12">Seu carrinho está vazio.</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name || item.brand} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-rose-200" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.name || item.brand}</p>
                      {item.color && <p className="text-xs text-gray-400">{item.color}</p>}
                      <p className="text-rose-600 text-sm font-bold">{fmt(item.sale_price * item.qty)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                        <button onClick={() => updateQty(item.id, -1)} className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 text-sm font-bold transition-colors">−</button>
                        <span className="px-2 text-sm font-bold text-gray-800 border-x border-gray-200 tabular-nums">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 text-sm font-bold transition-colors">+</button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Rodapé com total e botão */}
            {cart.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Total do pedido</span>
                  <span className="font-bold text-rose-600 text-xl tabular-nums">{fmt(totalPrice)}</span>
                </div>
                <button
                  onClick={handleWhatsApp}
                  className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                >
                  <MessageCircle className="w-5 h-5" />
                  Pedir pelo WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
