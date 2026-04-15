import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Plus, Search, Package, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import ProductCard from '../components/ProductCard'

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts()
  }, [])

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

  const filtered = products.filter(p =>
    (p.brand?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.type?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (p.color?.toLowerCase() || '').includes(search.toLowerCase())
  )

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

        {/* Resumo */}
        <div className="flex items-center gap-2 mb-5 text-sm text-gray-500">
          <Package className="w-4 h-4 text-rose-400" />
          <span>
            {search
              ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} para "${search}"`
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
      </div>

      {/* FAB - Botão de adicionar */}
      <button
        onClick={() => navigate('/produtos/novo')}
        className="fixed bottom-6 right-6 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-2xl px-5 py-3.5 shadow-lg shadow-rose-200 transition-all flex items-center gap-2 font-semibold"
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
