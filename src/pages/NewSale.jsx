import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  ShoppingCart, Plus, Minus, Trash2, Tag, ArrowLeft,
  CheckCircle, User, Phone, Percent, Package, ChevronDown, Search, X
} from 'lucide-react'

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function NewSale() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [products, setProducts]     = useState([])
  const [cart, setCart]             = useState([])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)

  // Produto a adicionar
  const [selectedId, setSelectedId]     = useState('')
  const [addQty, setAddQty]             = useState(1)
  const [addDiscount, setAddDiscount]   = useState('')

  // Cliente
  const [customerName, setCustomerName]   = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerId, setCustomerId]       = useState(null)  // se selecionou existente
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions]         = useState(false)
  const [searchingCustomer, setSearchingCustomer]     = useState(false)
  const customerRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => { fetchProducts() }, [])

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (customerRef.current && !customerRef.current.contains(e.target))
        setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  // ── Busca de cliente enquanto digita ──────────────────────

  const searchCustomers = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setCustomerSuggestions([])
      setShowSuggestions(false)
      return
    }
    setSearchingCustomer(true)
    const q = query.trim()
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, cpf_cnpj')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(6)
    setCustomerSuggestions(data || [])
    setShowSuggestions(true)
    setSearchingCustomer(false)
  }, [])

  const handleCustomerNameChange = (value) => {
    setCustomerName(value)
    setCustomerId(null)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchCustomers(value), 300)
  }

  const handleCustomerPhoneChange = (value) => {
    setCustomerPhone(value)
    setCustomerId(null)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchCustomers(value), 300)
  }

  const selectCustomer = (c) => {
    setCustomerName(c.name)
    setCustomerPhone(c.phone)
    setCustomerId(c.id)
    setShowSuggestions(false)
    setCustomerSuggestions([])
  }

  const clearCustomer = () => {
    setCustomerName('')
    setCustomerPhone('')
    setCustomerId(null)
    setCustomerSuggestions([])
    setShowSuggestions(false)
  }

  // ── Produto selecionado ───────────────────────────────────

  const selectedProduct = products.find(p => p.id === selectedId) || null

  // ── Carrinho ──────────────────────────────────────────────

  const addToCart = () => {
    if (!selectedProduct) return setError('Selecione um produto.')
    if (addQty <= 0)      return setError('Quantidade deve ser maior que zero.')

    const inCart    = cart.find(i => i.product.id === selectedProduct.id)
    const alreadyQty = inCart ? inCart.quantity : 0
    const available  = selectedProduct.quantity ?? 0

    if (alreadyQty + addQty > available)
      return setError(`Estoque insuficiente. Disponível: ${available - alreadyQty} un.`)

    setError('')
    if (inCart) {
      setCart(cart.map(i =>
        i.product.id === selectedProduct.id
          ? { ...i, quantity: i.quantity + addQty, discount: parseFloat(addDiscount) || 0 }
          : i
      ))
    } else {
      setCart([...cart, {
        product:  selectedProduct,
        quantity: addQty,
        discount: parseFloat(addDiscount) || 0,
      }])
    }
    setSelectedId(''); setAddQty(1); setAddDiscount('')
  }

  const removeFromCart = (pid) => setCart(cart.filter(i => i.product.id !== pid))

  const updateCartQty = (pid, delta) =>
    setCart(cart.map(i => {
      if (i.product.id !== pid) return i
      const newQty = i.quantity + delta
      if (newQty <= 0 || newQty > (i.product.quantity ?? 0)) return i
      return { ...i, quantity: newQty }
    }))

  const updateCartDiscount = (pid, value) =>
    setCart(cart.map(i => i.product.id === pid ? { ...i, discount: parseFloat(value) || 0 } : i))

  // ── Cálculos ──────────────────────────────────────────────

  const cartItems = cart.map(i => {
    const unitPrice = parseFloat(i.product.sale_price)
    const gross     = unitPrice * i.quantity
    const discAmt   = gross * (i.discount / 100)
    const total     = gross - discAmt
    return { ...i, unitPrice, gross, discAmt, total }
  })

  const subtotal      = cartItems.reduce((s, i) => s + i.gross,   0)
  const totalDiscount = cartItems.reduce((s, i) => s + i.discAmt, 0)
  const grandTotal    = cartItems.reduce((s, i) => s + i.total,   0)

  // ── Checkout ──────────────────────────────────────────────

  const handleCheckout = async () => {
    setError('')
    if (cart.length === 0) return setError('Adicione ao menos um produto ao carrinho.')

    setSaving(true)
    try {
      const orderId = crypto.randomUUID()
      let finalCustomerId = customerId

      // Buscar ou criar cliente se nome/telefone informados
      if (customerName.trim() || customerPhone.trim()) {
        if (!finalCustomerId) {
          // Tenta buscar cliente existente por telefone ou nome
          const searchPhone = customerPhone.trim()
          const searchName  = customerName.trim()

          let existing = null

          if (searchPhone) {
            const { data } = await supabase
              .from('customers')
              .select('id')
              .eq('phone', searchPhone)
              .maybeSingle()
            existing = data
          }

          if (!existing && searchName) {
            const { data } = await supabase
              .from('customers')
              .select('id')
              .ilike('name', searchName)
              .maybeSingle()
            existing = data
          }

          if (existing) {
            finalCustomerId = existing.id
            // Atualiza nome/telefone caso necessário
            await supabase.from('customers').update({
              name:       searchName  || undefined,
              phone:      searchPhone || undefined,
              updated_at: new Date().toISOString(),
            }).eq('id', existing.id)
          } else {
            // Cria novo cliente
            const { data: newC, error: cErr } = await supabase
              .from('customers')
              .insert([{
                name:  searchName  || 'Cliente',
                phone: searchPhone || '',
              }])
              .select('id')
              .single()
            if (cErr) throw cErr
            finalCustomerId = newC.id
          }
        }
      }

      // Inserir linhas de venda
      const salesRows = cartItems.map(i => ({
        order_id:         orderId,
        product_id:       i.product.id,
        user_id:          user.id,
        seller_email:     user.email,
        customer_id:      finalCustomerId || null,
        customer_name:    customerName.trim() || null,
        customer_phone:   customerPhone.trim() || null,
        quantity_sold:    i.quantity,
        unit_price:       i.unitPrice,
        discount_percent: i.discount,
        discount_amount:  i.discAmt,
        total_price:      i.total,
      }))

      const { error: saleErr } = await supabase.from('sales').insert(salesRows)
      if (saleErr) throw saleErr

      // Baixar estoque
      for (const i of cartItems) {
        await supabase
          .from('products')
          .update({ quantity: (i.product.quantity ?? 0) - i.quantity })
          .eq('id', i.product.id)
      }

      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Erro ao registrar venda.')
    } finally {
      setSaving(false)
    }
  }

  const handleNewSale = () => {
    setCart([]); setCustomerName(''); setCustomerPhone('')
    setCustomerId(null); setSelectedId(''); setAddQty(1)
    setAddDiscount(''); setSuccess(false)
    fetchProducts()
  }

  // ── Tela de sucesso ───────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 pb-28 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-bold text-gray-900 text-xl">Venda registrada!</h2>
          <p className="text-gray-500 text-sm">
            {cartItems.length} {cartItems.length === 1 ? 'produto' : 'produtos'}
            {customerName ? <> para <strong>{customerName}</strong></> : ''}
          </p>
          <div className="bg-green-50 rounded-2xl px-4 py-3">
            <p className="text-2xl font-bold text-green-700">{fmt(grandTotal)}</p>
            {totalDiscount > 0 && (
              <p className="text-xs text-green-600 mt-0.5">Desconto: {fmt(totalDiscount)}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => navigate('/')}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-2xl text-sm hover:bg-gray-50 transition-colors">
              Produtos
            </button>
            <button onClick={handleNewSale}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-2xl text-sm transition-colors">
              Nova venda
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário ────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button type="button" onClick={() => navigate(-1)}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShoppingCart className="w-5 h-5 text-rose-400" />
          <h1 className="font-bold text-gray-900 text-lg">Nova Venda</h1>
        </div>
        {cart.length > 0 && (
          <span className="bg-rose-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {cart.reduce((s, i) => s + i.quantity, 0)}
          </span>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Cliente (opcional) ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-rose-400" /> Cliente
            </h2>
            <span className="text-xs text-gray-400">opcional</span>
          </div>

          <div ref={customerRef} className="space-y-2 relative">
            {/* Nome */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text" value={customerName}
                onChange={e => handleCustomerNameChange(e.target.value)}
                onFocus={() => customerName.length >= 2 && setShowSuggestions(true)}
                placeholder="Nome do cliente (busca automática)"
                className="w-full border border-gray-200 rounded-xl pl-8 pr-8 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
              {customerName && (
                <button onClick={clearCustomer}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Telefone */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="tel" value={customerPhone}
                onChange={e => handleCustomerPhoneChange(e.target.value)}
                onFocus={() => customerPhone.length >= 2 && setShowSuggestions(true)}
                placeholder="Telefone"
                className="w-full border border-gray-200 rounded-xl pl-8 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
            </div>

            {/* Badge cliente vinculado */}
            {customerId && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Cliente existente selecionado
              </div>
            )}

            {/* Dropdown de sugestões */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 overflow-hidden mt-1">
                {searchingCustomer ? (
                  <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                    Buscando...
                  </div>
                ) : customerSuggestions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">
                    Nenhum cliente encontrado — será criado um novo.
                  </div>
                ) : (
                  <>
                    <p className="px-3 pt-2 pb-1 text-xs text-gray-400 font-semibold">Clientes encontrados</p>
                    {customerSuggestions.map(c => (
                      <button key={c.id}
                        onMouseDown={() => selectCustomer(c)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rose-50 transition-colors text-left border-t border-gray-50">
                        <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-rose-600 text-xs font-bold">{c.name[0]?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.phone}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Adicionar produto ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
          <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-rose-400" /> Adicionar produto
          </h2>

          <div className="relative">
            <select value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setError('') }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 appearance-none pr-8">
              <option value="">Selecione um produto...</option>
              {products.map(p => {
                const inCart    = cart.find(i => i.product.id === p.id)
                const available = (p.quantity ?? 0) - (inCart?.quantity ?? 0)
                return (
                  <option key={p.id} value={p.id} disabled={available <= 0}>
                    {p.name || p.brand}
                    {p.color ? ` · ${p.color}` : ''}
                    {available <= 0 ? ' — SEM ESTOQUE' : ` — ${available} un. · ${fmt(p.sale_price)}`}
                  </option>
                )
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {selectedProduct && (
            <div className="bg-rose-50 rounded-xl px-3 py-2 flex items-center gap-3">
              {selectedProduct.image_url
                ? <img src={selectedProduct.image_url} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                : <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-rose-300" />
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{selectedProduct.name || selectedProduct.brand}</p>
                <p className="text-xs text-gray-500">{fmt(selectedProduct.sale_price)} · Estoque: {selectedProduct.quantity ?? 0} un.</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
              <button type="button" onClick={() => setAddQty(q => Math.max(1, q - 1))}
                className="px-3 py-2.5 text-gray-500 hover:bg-gray-100 transition-colors text-lg font-bold">−</button>
              <input type="number" value={addQty} min="1"
                onChange={e => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 text-center text-sm font-bold text-gray-800 border-x border-gray-200 py-2.5 focus:outline-none bg-white" />
              <button type="button" onClick={() => setAddQty(q => q + 1)}
                className="px-3 py-2.5 text-gray-500 hover:bg-gray-100 transition-colors text-lg font-bold">+</button>
            </div>

            <div className="relative flex-1">
              <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="number" value={addDiscount}
                onChange={e => setAddDiscount(e.target.value)}
                min="0" max="100" placeholder="Desc. %"
                className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white" />
            </div>

            <button type="button" onClick={addToCart} disabled={!selectedId}
              className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 text-sm shrink-0">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {/* ── Carrinho ── */}
        {cart.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-rose-400" /> Carrinho
              <span className="ml-auto text-xs font-normal text-gray-400">
                {cart.reduce((s, i) => s + i.quantity, 0)} itens
              </span>
            </h2>

            <div className="space-y-2">
              {cartItems.map(item => (
                <div key={item.product.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {item.product.image_url
                      ? <img src={item.product.image_url} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                      : <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center shrink-0">
                          <Tag className="w-3.5 h-3.5 text-rose-300" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.product.name || item.product.brand}</p>
                      <p className="text-xs text-gray-400">{fmt(item.unitPrice)} / un.</p>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button type="button" onClick={() => updateCartQty(item.product.id, -1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 text-sm font-bold text-gray-800 border-x border-gray-200 py-1">
                        {item.quantity}
                      </span>
                      <button type="button" onClick={() => updateCartQty(item.product.id, 1)}
                        className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="relative w-24">
                      <Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <input type="number" value={item.discount || ''}
                        onChange={e => updateCartDiscount(item.product.id, e.target.value)}
                        min="0" max="100" placeholder="0"
                        className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white" />
                    </div>

                    <div className="ml-auto text-right">
                      <p className="text-sm font-bold text-gray-900">{fmt(item.total)}</p>
                      {item.discAmt > 0 && (
                        <p className="text-xs text-orange-500">−{fmt(item.discAmt)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo */}
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-700">{fmt(subtotal)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-orange-500">Descontos</span>
                  <span className="text-orange-500 font-medium">− {fmt(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-bold text-gray-800">Total</span>
                <span className="font-bold text-rose-600 text-lg">{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm flex gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <button onClick={handleCheckout} disabled={saving || cart.length === 0}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-200">
          {saving
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><ShoppingCart className="w-5 h-5" /> Finalizar Venda · {fmt(grandTotal)}</>}
        </button>
      </div>
    </div>
  )
}
