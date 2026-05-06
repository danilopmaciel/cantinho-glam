import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStoreAuth } from '../contexts/StoreAuthContext'
import {
  ShoppingCart, X, Package, MessageCircle,
  Search, User, LogOut, ChevronDown, Instagram,
} from 'lucide-react'

const WHATSAPP    = '5514991116961'
const INSTAGRAM   = 'https://www.instagram.com/cantinho.glam/'
const STORE_NAME  = 'Cantinho Glam'

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function Store() {
  const { user, profile, saveOrder } = useStoreAuth()
  const navigate = useNavigate()

  const [products, setProducts]           = useState([])
  const [cart, setCart]                   = useState([])
  const [showCart, setShowCart]           = useState(false)
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [showUserMenu, setShowUserMenu]   = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    fetchProducts()
    const saved = localStorage.getItem('cantinho_cart')
    if (saved) { try { setCart(JSON.parse(saved)) } catch {} }
  }, [])

  useEffect(() => {
    localStorage.setItem('cantinho_cart', JSON.stringify(cart))
  }, [cart])

  // Fecha menu de usuário ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, brand, type, color, size, image_url, sale_price, quantity')
      .order('type').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  // Categorias únicas
  const categories = [...new Set(products.map(p => p.type).filter(Boolean))].sort()

  // Produtos filtrados por busca e categoria
  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.color || '').toLowerCase().includes(q) ||
      (p.type || '').toLowerCase().includes(q)
    const matchCat = !activeCategory || p.type === activeCategory
    return matchSearch && matchCat
  })

  // Agrupa por categoria (apenas quando sem busca ativa)
  const grouped = activeCategory || search
    ? { [activeCategory || 'Resultados']: filteredProducts }
    : filteredProducts.reduce((acc, p) => {
        const key = p.type || 'Outros'
        if (!acc[key]) acc[key] = []
        acc[key].push(p)
        return acc
      }, {})

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
      prev.map(i => {
        if (i.id !== id) return i
        const newQty = i.qty + delta
        if (newQty <= 0) return null
        if (newQty > i.quantity) return i
        return { ...i, qty: newQty }
      }).filter(Boolean)
    )
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))

  const totalItems = cart.reduce((s, i) => s + i.qty, 0)
  const totalPrice = cart.reduce((s, i) => s + i.sale_price * i.qty, 0)

  const handleWhatsApp = async () => {
    const lines = cart.map(i => {
      const name  = i.name || i.brand
      const color = i.color ? ` (${i.color})` : ''
      return `• ${name}${color} x${i.qty} — ${fmt(i.sale_price * i.qty)}`
    })
    const nameStr = profile?.name ? `, ${profile.name}` : ''
    const text = [
      `🛍️ *Pedido - ${STORE_NAME}*`,
      ...(profile?.name ? [`👤 ${profile.name}`] : []),
      '',
      ...lines,
      '',
      `💰 *Total: ${fmt(totalPrice)}*`,
      '',
      `Gostaria de finalizar meu pedido${nameStr}! 😊`,
    ].join('\n')

    // Salva pedido se logado
    if (user) {
      await saveOrder(
        cart.map(i => ({ id: i.id, name: i.name || i.brand, color: i.color, qty: i.qty, price: i.sale_price })),
        totalPrice
      )
    }

    setCart([])
    setShowCart(false)
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank')
  }

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário'

  return (
    <div className="min-h-screen bg-rose-50/30">

      {/* Barra de anúncio */}
      <div className="bg-rose-600 text-white text-xs text-center py-2 px-4 font-medium tracking-wide">
        🌸 Entregamos no dia · Segunda a Sábado · Bauru/SP
      </div>

      {/* Header */}
      <header className="bg-white border-b border-rose-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">

            {/* Logo */}
            <Link to="/loja" className="flex items-center gap-1.5 shrink-0">
              <span className="text-lg">✨</span>
              <span className="font-black text-rose-500 text-lg leading-none">{STORE_NAME}</span>
            </Link>

            {/* Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setActiveCategory(null) }}
                placeholder="Buscar produto..."
                className="w-full border border-gray-200 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 placeholder-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Usuário */}
            <div ref={userMenuRef} className="relative shrink-0">
              {user ? (
                <>
                  <button
                    onClick={() => setShowUserMenu(v => !v)}
                    className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2 rounded-full text-sm font-semibold transition-colors"
                  >
                    <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{displayName[0]?.toUpperCase()}</span>
                    </div>
                    <span className="hidden sm:block max-w-[80px] truncate">{displayName}</span>
                    <ChevronDown className="w-3.5 h-3.5 hidden sm:block" />
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-30 overflow-hidden py-1">
                      <Link to="/loja/perfil" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 transition-colors">
                        <User className="w-4 h-4 text-rose-400" /> Meu perfil
                      </Link>
                      <Link to="/loja/pedidos" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 transition-colors">
                        <ShoppingCart className="w-4 h-4 text-rose-400" /> Meus pedidos
                      </Link>
                      <button
                        onClick={async () => { await supabase.auth.signOut(); setShowUserMenu(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50">
                        <LogOut className="w-4 h-4" /> Sair
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link to="/loja/entrar"
                  className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 rounded-full text-sm font-semibold transition-colors">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">Entrar</span>
                </Link>
              )}
            </div>

            {/* Carrinho */}
            <button onClick={() => setShowCart(true)}
              className="relative p-2 text-gray-500 hover:text-rose-500 transition-colors shrink-0">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-xs font-bold w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center leading-none px-0.5">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Categorias */}
        <div className="border-t border-rose-50 overflow-x-auto">
          <div className="flex gap-2 px-4 py-2.5 max-w-3xl mx-auto">
            <button
              onClick={() => { setActiveCategory(null); setSearch('') }}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                !activeCategory && !search ? 'bg-rose-500 text-white shadow-sm' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSearch('') }}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  activeCategory === cat ? 'bg-rose-500 text-white shadow-sm' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Catálogo */}
      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum produto encontrado para "{search}".</p>
          </div>
        ) : (
          Object.entries(grouped).map(([type, items]) => (
            <section key={type} className="mb-8">
              {(!search && !activeCategory || Object.keys(grouped).length > 1) && (
                <h2 className="font-bold text-gray-500 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-5 h-0.5 bg-rose-400 rounded-full inline-block" />
                  {type}
                </h2>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map(p => {
                  const inStock = (p.quantity ?? 0) > 0
                  const inCart  = cart.find(i => i.id === p.id)
                  return (
                    <div key={p.id}
                      className="bg-white rounded-2xl overflow-hidden border border-rose-100 shadow-sm hover:shadow-md transition-all duration-200 group">
                      {/* Imagem */}
                      <div className="relative aspect-square bg-gradient-to-br from-rose-50 to-pink-50">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name || p.brand}
                            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${!inStock ? 'opacity-60' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-rose-200" />
                          </div>
                        )}
                        {!inStock && (
                          <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
                            <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                              Em breve ✨
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
                          {p.name || p.brand}
                        </p>
                        {p.color && (
                          <span className="inline-block text-xs text-rose-400 bg-rose-50 rounded-full px-2 py-0.5 mt-1">
                            {p.color}
                          </span>
                        )}
                        <p className="font-black text-rose-500 text-base mt-2">{fmt(p.sale_price)}</p>

                        {inStock ? (
                          inCart ? (
                            <div className="flex items-center justify-between mt-2 bg-rose-50 rounded-xl px-1 py-0.5 border border-rose-100">
                              <button onClick={() => updateQty(p.id, -1)}
                                className="w-8 h-8 flex items-center justify-center text-rose-500 font-bold text-lg hover:bg-rose-100 rounded-lg transition-colors">
                                −
                              </button>
                              <span className="text-sm font-bold text-gray-800">{inCart.qty}</span>
                              <button onClick={() => updateQty(p.id, 1)}
                                className="w-8 h-8 flex items-center justify-center text-rose-500 font-bold text-lg hover:bg-rose-100 rounded-lg transition-colors">
                                +
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(p)}
                              className="w-full mt-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm shadow-rose-200">
                              Adicionar
                            </button>
                          )
                        ) : (
                          <div className="mt-2 text-center text-xs text-gray-400 py-2 bg-gray-50 rounded-xl">
                            Indisponível
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-rose-100 text-center space-y-4">
          <p className="font-black text-rose-400 text-lg">✨ {STORE_NAME}</p>
          <p className="text-xs text-gray-400">Para Nails & Lash Designers · Bauru, SP</p>
          <div className="flex items-center justify-center gap-4">
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold px-4 py-2 rounded-full hover:opacity-90 transition-opacity shadow-sm">
              <Instagram className="w-4 h-4" />
              @cantinho.glam
            </a>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-full hover:opacity-90 transition-opacity shadow-sm">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
          <div className="pt-4">
            <Link to="/login" className="text-xs text-gray-300 hover:text-gray-400 transition-colors">
              Área administrativa
            </Link>
          </div>
        </footer>
      </main>

      {/* Botão flutuante carrinho */}
      {totalItems > 0 && !showCart && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-20 flex justify-center">
          <button onClick={() => setShowCart(true)}
            className="w-full max-w-sm flex items-center justify-between bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 px-5 rounded-2xl shadow-xl shadow-rose-300 transition-all active:scale-95">
            <span className="bg-rose-600 rounded-lg px-2.5 py-0.5 text-sm tabular-nums">{totalItems}</span>
            <span>Ver carrinho</span>
            <span className="tabular-nums">{fmt(totalPrice)}</span>
          </button>
        </div>
      )}

      {/* Sheet do carrinho */}
      {showCart && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-rose-400" />
                Carrinho
                {totalItems > 0 && <span className="text-sm font-normal text-gray-400">· {totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>}
              </h2>
              <button onClick={() => setShowCart(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-12">Seu carrinho está vazio.</p>
              ) : cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-rose-50/50 rounded-2xl p-3 border border-rose-100">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    : <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-rose-300" />
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name || item.brand}</p>
                    {item.color && <p className="text-xs text-gray-400">{item.color}</p>}
                    <p className="text-rose-500 text-sm font-bold">{fmt(item.sale_price * item.qty)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center border border-rose-200 rounded-xl overflow-hidden bg-white">
                      <button onClick={() => updateQty(item.id, -1)} className="px-2.5 py-1.5 text-rose-400 hover:bg-rose-50 text-sm font-bold transition-colors">−</button>
                      <span className="px-2 text-sm font-bold text-gray-800 border-x border-rose-100 tabular-nums">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="px-2.5 py-1.5 text-rose-400 hover:bg-rose-50 text-sm font-bold transition-colors">+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                {!user && (
                  <p className="text-xs text-center text-gray-400">
                    <Link to="/loja/entrar" className="text-rose-500 font-semibold">Entre na sua conta</Link>
                    {' '}para salvar seu histórico de pedidos
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Total do pedido</span>
                  <span className="font-black text-rose-500 text-xl tabular-nums">{fmt(totalPrice)}</span>
                </div>
                <button onClick={handleWhatsApp}
                  className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200">
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
