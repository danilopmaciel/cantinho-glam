import { Pencil, Trash2, Tag, Package } from 'lucide-react'

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function ProductCard({ product, onEdit, onDelete }) {
  const qty = product.quantity ?? 0
  const stockColor = qty === 0
    ? 'bg-red-100 text-red-600'
    : qty <= 3
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-blue-100 text-blue-700'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Imagem */}
      {product.image_url ? (
        <img src={product.image_url} alt={product.name || `${product.brand} ${product.type}`}
          className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center">
          <Tag className="w-12 h-12 text-rose-200" />
        </div>
      )}

      {/* Conteúdo */}
      <div className="p-4">
        {/* Título + ações */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-800 truncate">{product.name || product.brand}</h3>
            <p className="text-sm text-gray-500 truncate">
              {[product.brand, product.type].filter(Boolean).join(' · ') || ' '}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onEdit} title="Editar"
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onDelete} title="Excluir"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {product.color && (
            <span className="bg-rose-50 text-rose-600 text-xs px-2 py-0.5 rounded-full font-medium">
              {product.color}
            </span>
          )}
          {product.size && (
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
              {product.size}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${stockColor}`}>
            <Package className="w-3 h-3" />
            {qty === 0 ? 'Sem estoque' : `${qty} un.`}
          </span>
        </div>

        {/* Preços */}
        <div className="border-t border-gray-100 pt-3 flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Preço de venda</p>
            <p className="font-bold text-gray-900 text-lg">{formatCurrency(product.sale_price)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Margem</p>
            <span className="inline-block bg-green-100 text-green-700 text-sm font-bold px-2 py-0.5 rounded-lg">
              +{parseFloat(product.profit_margin).toFixed(1)}%
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-1.5">
          Lucro: <span className="text-green-600 font-medium">
            {formatCurrency(product.sale_price - product.purchase_price)}
          </span> / unidade
        </p>
      </div>
    </div>
  )
}
