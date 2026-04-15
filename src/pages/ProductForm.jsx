import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, Camera, ImageIcon, X, TrendingUp } from 'lucide-react'

const PRODUCT_TYPES = [
  'Base', 'Batom', 'Blush', 'Bronzer', 'Corretivo', 'Delineador',
  'Esmalte', 'Gloss Labial', 'Hidratante', 'Iluminador', 'Máscara para Cílios',
  'Perfume / Colônia', 'Primer', 'Protetor Solar', 'Rímel', 'Sérum',
  'Sombra', 'Tônico Facial', 'Outro',
]

// Calcula preço de venda a partir do preço de compra e margem
const calcSalePrice = (purchasePrice, margin) => {
  const p = parseFloat(purchasePrice)
  const m = parseFloat(margin)
  if (isNaN(p) || isNaN(m) || p <= 0) return ''
  return (p * (1 + m / 100)).toFixed(2)
}

// Calcula margem a partir do preço de compra e preço de venda
const calcMargin = (purchasePrice, salePrice) => {
  const p = parseFloat(purchasePrice)
  const s = parseFloat(salePrice)
  if (isNaN(p) || isNaN(s) || p <= 0 || s < p) return ''
  return (((s - p) / p) * 100).toFixed(2)
}

export default function ProductForm() {
  const { id } = useParams()
  const isEditing = !!id
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [existingImageUrl, setExistingImageUrl] = useState(null)

  const [form, setForm] = useState({
    brand: '',
    type: '',
    color: '',
    size: '',
    purchase_price: '',
    profit_margin: '',
    sale_price: '',
  })

  useEffect(() => {
    if (isEditing) fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      setError('Produto não encontrado.')
    } else if (data) {
      setForm({
        brand: data.brand || '',
        type: data.type || '',
        color: data.color || '',
        size: data.size || '',
        purchase_price: data.purchase_price?.toString() || '',
        profit_margin: data.profit_margin?.toString() || '',
        sale_price: data.sale_price?.toString() || '',
      })
      if (data.image_url) {
        setImagePreview(data.image_url)
        setExistingImageUrl(data.image_url)
      }
    }
    setLoading(false)
  }

  // Atualiza campo e recalcula valores dependentes
  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }

      // Se preço de compra ou margem mudarem → recalcula preço de venda
      if (field === 'purchase_price' || field === 'profit_margin') {
        const pp = field === 'purchase_price' ? value : prev.purchase_price
        const mg = field === 'profit_margin' ? value : prev.profit_margin
        const sp = calcSalePrice(pp, mg)
        if (sp) updated.sale_price = sp
      }

      // Se preço de venda mudar → recalcula margem
      if (field === 'sale_price') {
        const mg = calcMargin(prev.purchase_price, value)
        if (mg !== '') updated.profit_margin = mg
      }

      return updated
    })
  }

  // Seleção de imagem (câmera ou galeria)
  const handleImageSelect = (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.')
      return
    }
    setImageFile(file)
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  // Upload da imagem no Supabase Storage
  const uploadImage = async (productId) => {
    if (!imageFile) return existingImageUrl

    const ext = imageFile.name.split('.').pop() || 'jpg'
    const filename = `${productId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filename, imageFile, { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filename)

    return publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.brand.trim()) return setError('Informe a marca do produto.')
    if (!form.type) return setError('Selecione o tipo do produto.')
    if (!form.purchase_price || parseFloat(form.purchase_price) <= 0)
      return setError('Informe o preço de compra.')

    setSaving(true)

    try {
      const productData = {
        brand: form.brand.trim(),
        type: form.type,
        color: form.color.trim() || null,
        size: form.size.trim() || null,
        purchase_price: parseFloat(form.purchase_price),
        profit_margin: parseFloat(form.profit_margin) || 0,
        sale_price: parseFloat(form.sale_price) || parseFloat(form.purchase_price),
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }

      let productId = id

      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single()
        if (error) throw error
        productId = data.id
      }

      // Upload da imagem (se houver nova imagem)
      if (imageFile || existingImageUrl) {
        const imageUrl = await uploadImage(productId)
        if (imageUrl !== existingImageUrl) {
          await supabase
            .from('products')
            .update({ image_url: imageUrl })
            .eq('id', productId)
        }
      }

      navigate('/')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Erro ao salvar produto. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // Valores calculados para exibição
  const profit = form.purchase_price && form.sale_price
    ? (parseFloat(form.sale_price) - parseFloat(form.purchase_price)).toFixed(2)
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-gray-900 text-lg">
          {isEditing ? 'Editar Produto' : 'Novo Produto'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Upload de Imagem */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Foto do Produto
          </label>

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-rose-200">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-52 object-cover"
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 hover:opacity-100">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="bg-white rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 flex items-center gap-1.5 shadow"
                >
                  <Camera className="w-4 h-4" /> Câmera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 flex items-center gap-1.5 shadow"
                >
                  <ImageIcon className="w-4 h-4" /> Galeria
                </button>
              </div>
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow text-gray-600 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white p-8 flex flex-col items-center gap-4">
              <ImageIcon className="w-10 h-10 text-gray-300" />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-4 py-2.5 flex items-center gap-2 font-semibold text-sm transition-colors"
                >
                  <Camera className="w-4 h-4" /> Câmera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-2.5 flex items-center gap-2 font-semibold text-sm transition-colors"
                >
                  <ImageIcon className="w-4 h-4" /> Galeria
                </button>
              </div>
              <p className="text-xs text-gray-400">JPG, PNG ou WEBP · máx. 5MB</p>
            </div>
          )}

          {/* Inputs de arquivo ocultos */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleImageSelect(e.target.files?.[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageSelect(e.target.files?.[0])}
          />
        </div>

        {/* Marca */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Marca <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.brand}
            onChange={(e) => handleChange('brand', e.target.value)}
            placeholder="Ex: MAC, L'Oréal, NYX, Maybelline..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Tipo <span className="text-rose-500">*</span>
          </label>
          <select
            value={form.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 appearance-none"
          >
            <option value="">Selecione o tipo...</option>
            {PRODUCT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Cor e Tamanho lado a lado */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cor</label>
            <input
              type="text"
              value={form.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="Ex: Vermelho, Nude..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tamanho</label>
            <input
              type="text"
              value={form.size}
              onChange={(e) => handleChange('size', e.target.value)}
              placeholder="Ex: 30ml, 50g..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
            />
          </div>
        </div>

        {/* Seção de Preços */}
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            <h3 className="font-bold text-gray-800 text-sm">Precificação</h3>
          </div>

          {/* Preço de Compra */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Preço de Compra (R$) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={form.purchase_price}
              onChange={(e) => handleChange('purchase_price', e.target.value)}
              step="0.01"
              min="0.01"
              placeholder="0,00"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
            />
          </div>

          {/* Margem e Preço de Venda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Margem de Lucro (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.profit_margin}
                  onChange={(e) => handleChange('profit_margin', e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-8 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Preço de Venda (R$)
              </label>
              <input
                type="number"
                value={form.sale_price}
                onChange={(e) => handleChange('sale_price', e.target.value)}
                step="0.01"
                min="0"
                placeholder="0,00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
              />
            </div>
          </div>

          {/* Lucro calculado */}
          {profit && parseFloat(profit) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-green-700">Lucro por unidade</span>
              <span className="font-bold text-green-700 text-lg">
                R$ {parseFloat(profit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <p className="text-xs text-gray-400">
            💡 Altere a margem e o preço de venda se atualizam automaticamente, e vice-versa.
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Botão de salvar */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-rose-200 mt-2"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
