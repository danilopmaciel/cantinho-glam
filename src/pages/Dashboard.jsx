import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, Search, Package, X, AlertTriangle, GitMerge } from 'lucide-react'
import Navbar from '../components/Navbar'
import ProductCard from '../components/ProductCard'

const LOW_STOCK_THRESHOLD = 3

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [conflicts, setConflicts] = useState([])
  const [merging, setMerging] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts()
    fetchConflicts()
  }, [])

  const fetchConflicts = async () => {
    const { data } = await supabase.rpc('get_phone_conflicts')
    setConflicts(data || [])
  }

  const handleMerge = async (profileId, customerId) => {
    setMerging(profileId)
    await supabase.rpc('merge_profile_customer', { p_profile_id: profileId, p_customer_id: customerId })
    setConflicts(prev => prev.filter(c => c.profile_id !== profileId))
    setMerging(null)
  }

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setProducts(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    setDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!deleteId) return

    // Deletar imagem do Storage se existir
    const product = products.find(p => p.id === deleteId)
    if (product?.image_url) {
      const filename = product.image_url.split('/').pop()
      await supabase.storage.from('product-images').remove([filename])
    }

    const { error } = await supabase.from('products').delete().eq('id', deleteId)
    if (!error) {
      setProducts(products.filter(p => p.id !== deleteId))
    }
    setDeleteId(null)
  }

  const outOfStock  = products.filter(p => (p.quantity ?? 0) === 0)
  const lowStock    = products.filter(p => (p.quantity ?? 0) > 0 && (p.quantity ?? 0) <= LOW_STOCK_THRESHOLD)

  const filtered = products.filter(p => {
    const q   = search.toLowerCase()
    const matchSearch =
      (p.name?.toLowerCase()  || '').includes(q) ||
      (p.brand?.toLowerCase() || '').includes(q) ||
      (p.type?.toLowerCase()  || '').includes(q) ||
      (p.color?.toLowerCase() || '').includes(q)
    if (!matchSearch) return false
    if (stockFilter === 'out')  return (p.quantity ?? 0) === 0
    if (stockFilter === 'low')  return (p.quantity ?? 0) > 0 && (p.quantity ?? 0) <= LOW_STOCK_THRESHOLD
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-5">

        {/* Barra de busca */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, tipo ou cor..."
            className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Alertas de estoque */}
        {!loading && (outOfStock.length > 0 || lowStock.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {outOfStock.length > 0 && (
              <button
                onClick={() => setStockFilter(stockFilter === 'out' ? null : 'out')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  stockFilter === 'out'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                }`}>
                <AlertTriangle className="w-3.5 h-3.5" />
                {outOfStock.length} sem estoque
              </button>
            )}
            {lowStock.length > 0 && (
              <button
                onClick={() => setStockFilter(stockFilter === 'low' ? null : 'low')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  stockFilter === 'low'
                    ? 'bg-yellow-500 text-white border-yellow-500'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                }`}>
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowStock.length} com estoque baixo
              </button>
            )}
            {stockFilter && (
              <button
                onClick={() => setStockFilter(null)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
                <X className="w-3 h-3" /> Limpar filtro
              </button>
            )}
          </div>
        )}

        {/* Resumo */}
        <div className="flex items-center gap-2 mb-5 text-sm text-gray-500">
          <Package className="w-4 h-4 text-rose-400" />
          <span>
            {search || stockFilter
              ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
              : `${products.length} produto${products.length !== 1 ? 's' : ''} cadastrado${products.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Grid de produtos */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package className="w-14 h-14 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-500">
              {search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado ainda'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/produtos/novo')}
                className="mt-4 text-rose-500 font-semibold hover:underline"
              >
                + Adicionar primeiro produto
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => navigate(`/produtos/${product.id}/editar`)}
                onDelete={() => handleDelete(product.id)}
              />
            ))}
          </div>
        )}
        {/* Cadastros duplicados */}
        {conflicts.length > 0 && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2">
              <GitMerge className="w-4 h-4" />
              Cadastros duplicados ({conflicts.length})
              <span className="font-normal text-amber-600 text-xs">· mesmo telefone na loja e no cadastro</span>
            </h3>
            {conflicts.map(c => (
              <div key={c.profile_id} className="bg-white rounded-xl border border-amber-100 p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {c.profile_name || '(sem nome)'} · {c.profile_phone}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    Loja: {c.profile_email} · Cliente: {c.customer_name}
                  </p>
                </div>
                <button
                  onClick={() => handleMerge(c.profile_id, c.customer_id)}
                  disabled={merging === c.profile_id}
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                  {merging === c.profile_id
                    ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <GitMerge className="w-3.5 h-3.5" />
                  }
                  Mesclar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB - Botão de adicionar */}
      <button
        onClick={() => navigate('/produtos/novo')}
        className="fixed bottom-20 right-6 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-2xl px-5 py-3.5 shadow-lg shadow-rose-200 transition-all flex items-center gap-2 font-semibold"
      >
        <Plus className="w-5 h-5" />
        <span className="hidden sm:inline">Novo produto</span>
      </button>

      {/* Modal de confirmação de exclusão */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Excluir produto?</h3>
            <p className="text-gray-500 text-sm mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
