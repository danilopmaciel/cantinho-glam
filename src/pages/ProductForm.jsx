import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, Camera, ImageIcon, X, TrendingUp, ZapOff, Package, History } from 'lucide-react'

const PRODUCT_TYPES = [
  'Base', 'Batom', 'Blush', 'Bronzer', 'Corretivo', 'Delineador',
  'Esmalte', 'Gloss Labial', 'Hidratante', 'Iluminador', 'Máscara para Cílios',
  'Perfume / Colônia', 'Primer', 'Protetor Solar', 'Rímel', 'Sérum',
  'Sombra', 'Tônico Facial', 'Outro',
]

const ADJUSTMENT_REASONS = [
  'Compra / Reposição de estoque',
  'Ajuste de inventário',
  'Produto danificado',
  'Devolução de cliente',
  'Correção de erro',
  'Outro',
]

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

const calcSalePrice = (purchasePrice, margin) => {
  const p = parseFloat(purchasePrice)
  const m = parseFloat(margin)
  if (isNaN(p) || isNaN(m) || p <= 0) return ''
  return (p * (1 + m / 100)).toFixed(2)
}

const calcMargin = (purchasePrice, salePrice) => {
  const p = parseFloat(purchasePrice)
  const s = parseFloat(salePrice)
  if (isNaN(p) || isNaN(s) || p <= 0 || s < p) return ''
  return (((s - p) / p) * 100).toFixed(2)
}

export default function ProductForm() {
  const { id } = useParams()
  const isEditing = !!id
  const navigate  = useNavigate()
  const { user }  = useAuth()

  // Refs
  const fileInputRef   = useRef(null)
  const cameraInputRef = useRef(null)
  const videoRef       = useRef(null)
  const canvasRef      = useRef(null)
  const streamRef      = useRef(null)

  // Estado geral
  const [loading, setLoading]                   = useState(false)
  const [saving, setSaving]                     = useState(false)
  const [error, setError]                       = useState('')
  const [imageFile, setImageFile]               = useState(null)
  const [imagePreview, setImagePreview]         = useState(null)
  const [existingImageUrl, setExistingImageUrl] = useState(null)
  const [currentStock, setCurrentStock]         = useState(0)

  // Estado ajuste de estoque (apenas no modo edição)
  const [adjustQty, setAdjustQty]     = useState('')
  const [adjustReason, setAdjustReason] = useState(ADJUSTMENT_REASONS[0])
  const [adjustHistory, setAdjustHistory] = useState([])

  // Estado webcam
  const [showWebcam, setShowWebcam] = useState(false)
  const [webcamError, setWebcamError] = useState('')
  const [webcamReady, setWebcamReady] = useState(false)

  const [form, setForm] = useState({
    brand: '', type: '', color: '', size: '',
    purchase_price: '', profit_margin: '', sale_price: '',
    quantity: '',
  })

  useEffect(() => {
    if (isEditing) { fetchProduct(); fetchAdjustmentHistory() }
    return () => stopStream()
  }, [id])

  const fetchProduct = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
    if (error) {
      setError('Produto não encontrado.')
    } else if (data) {
      setCurrentStock(data.quantity ?? 0)
      setForm({
        brand: data.brand || '', type: data.type || '',
        color: data.color || '', size: data.size || '',
        purchase_price: data.purchase_price?.toString() || '',
        profit_margin:  data.profit_margin?.toString() || '',
        sale_price:     data.sale_price?.toString() || '',
        quantity:       data.quantity?.toString() || '0',
      })
      if (data.image_url) { setImagePreview(data.image_url); setExistingImageUrl(data.image_url) }
    }
    setLoading(false)
  }

  const fetchAdjustmentHistory = async () => {
    const { data } = await supabase
      .from('stock_adjustments')
      .select('*, profiles(email)')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(5)
    setAdjustHistory(data || [])
  }

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'purchase_price' || field === 'profit_margin') {
        const pp = field === 'purchase_price' ? value : prev.purchase_price
        const mg = field === 'profit_margin'  ? value : prev.profit_margin
        const sp = calcSalePrice(pp, mg)
        if (sp) updated.sale_price = sp
      }
      if (field === 'sale_price') {
        const mg = calcMargin(prev.purchase_price, value)
        if (mg !== '') updated.profit_margin = mg
      }
      return updated
    })
  }

  // Estoque resultante após ajuste
  const adjustValue   = parseInt(adjustQty) || 0
  const newStockAfter = currentStock + adjustValue

  const handleImageSelect = (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('A imagem deve ter no máximo 5MB.'); return }
    setImageFile(file)
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null); setImagePreview(null)
    if (fileInputRef.current)   fileInputRef.current.value   = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  // ── Webcam ──────────────────────────────────────────────
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const openWebcam = async () => {
    if (isMobile()) { cameraInputRef.current?.click(); return }
    setWebcamError(''); setWebcamReady(false); setShowWebcam(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => { videoRef.current.play(); setWebcamReady(true) }
      }
    } catch (err) {
      const msgs = {
        NotAllowedError:  'Permissão negada. Permita o acesso à câmera no navegador.',
        NotFoundError:    'Nenhuma câmera encontrada neste dispositivo.',
        NotReadableError: 'A câmera está sendo usada por outro programa.',
      }
      setWebcamError(msgs[err.name] || `Erro ao acessar câmera: ${err.message}`)
    }
  }

  const capturePhoto = useCallback(() => {
    const video = videoRef.current; const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      handleImageSelect(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      closeWebcam()
    }, 'image/jpeg', 0.92)
  }, [])

  const closeWebcam = () => { stopStream(); setShowWebcam(false); setWebcamReady(false); setWebcamError('') }
  // ────────────────────────────────────────────────────────

  const uploadImage = async (productId) => {
    if (!imageFile) return existingImageUrl
    const ext = imageFile.name.split('.').pop() || 'jpg'
    const filename = `${productId}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('product-images').upload(filename, imageFile, { upsert: true })
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filename)
    return publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.brand.trim()) return setError('Informe a marca do produto.')
    if (!form.type)         return setError('Selecione o tipo do produto.')
    if (!form.purchase_price || parseFloat(form.purchase_price) <= 0)
      return setError('Informe o preço de compra.')
    if (isEditing && adjustQty !== '' && newStockAfter < 0)
      return setError('O ajuste resultaria em estoque negativo.')

    setSaving(true)
    try {
      // Calcula a nova quantidade
      const finalQty = isEditing
        ? (adjustQty !== '' ? newStockAfter : currentStock)  // edição: currentStock + ajuste
        : (parseInt(form.quantity) || 0)                     // novo: quantidade informada

      const productData = {
        brand: form.brand.trim(), type: form.type,
        color: form.color.trim() || null, size: form.size.trim() || null,
        purchase_price: parseFloat(form.purchase_price),
        profit_margin:  parseFloat(form.profit_margin) || 0,
        sale_price:     parseFloat(form.sale_price) || parseFloat(form.purchase_price),
        quantity:       finalQty,
        user_id:        user.id,
        updated_at:     new Date().toISOString(),
      }

      let productId = id

      if (isEditing) {
        const { error } = await supabase.from('products').update(productData).eq('id', id)
        if (error) throw error

        // Registra ajuste no histórico se houve mudança de quantidade
        if (adjustQty !== '' && adjustValue !== 0) {
          await supabase.from('stock_adjustments').insert([{
            product_id:   id,
            user_id:      user.id,
            old_quantity: currentStock,
            new_quantity: finalQty,
            adjustment:   adjustValue,
            reason:       adjustReason,
          }])
        }
      } else {
        const { data, error } = await supabase.from('products').insert([productData]).select().single()
        if (error) throw error
        productId = data.id
      }

      if (imageFile || existingImageUrl) {
        const imageUrl = await uploadImage(productId)
        if (imageUrl !== existingImageUrl)
          await supabase.from('products').update({ image_url: imageUrl }).eq('id', productId)
      }

      navigate('/')
    } catch (err) {
      setError(err.message || 'Erro ao salvar produto. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const profit = form.purchase_price && form.sale_price
    ? (parseFloat(form.sale_price) - parseFloat(form.purchase_price)).toFixed(2) : null

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Cabeçalho */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button type="button" onClick={() => navigate(-1)}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-gray-900 text-lg">
          {isEditing ? 'Editar Produto' : 'Novo Produto'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── Imagem ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Foto do Produto</label>
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-rose-200">
              <img src={imagePreview} alt="Preview" className="w-full h-52 object-cover" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center gap-3 opacity-0 hover:opacity-100">
                <button type="button" onClick={openWebcam}
                  className="bg-white rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 flex items-center gap-1.5 shadow">
                  <Camera className="w-4 h-4" /> Câmera
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="bg-white rounded-xl px-3 py-2 text-sm font-semibold text-gray-800 flex items-center gap-1.5 shadow">
                  <ImageIcon className="w-4 h-4" /> Galeria
                </button>
              </div>
              <button type="button" onClick={removeImage}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow text-gray-600 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white p-8 flex flex-col items-center gap-4">
              <ImageIcon className="w-10 h-10 text-gray-300" />
              <div className="flex gap-3">
                <button type="button" onClick={openWebcam}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-4 py-2.5 flex items-center gap-2 font-semibold text-sm transition-colors">
                  <Camera className="w-4 h-4" /> Câmera
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-2.5 flex items-center gap-2 font-semibold text-sm transition-colors">
                  <ImageIcon className="w-4 h-4" /> Galeria
                </button>
              </div>
              <p className="text-xs text-gray-400">JPG, PNG ou WEBP · máx. 5MB</p>
            </div>
          )}
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={(e) => handleImageSelect(e.target.files?.[0])} />
          <input ref={fileInputRef} type="file" accept="image/*"
            className="hidden" onChange={(e) => handleImageSelect(e.target.files?.[0])} />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Marca */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Marca <span className="text-rose-500">*</span>
          </label>
          <input type="text" value={form.brand} onChange={(e) => handleChange('brand', e.target.value)}
            placeholder="Ex: MAC, L'Oréal, NYX, Maybelline..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white" />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Tipo <span className="text-rose-500">*</span>
          </label>
          <select value={form.type} onChange={(e) => handleChange('type', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 appearance-none">
            <option value="">Selecione o tipo...</option>
            {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Cor e Tamanho */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cor</label>
            <input type="text" value={form.color} onChange={(e) => handleChange('color', e.target.value)}
              placeholder="Ex: Vermelho, Nude..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tamanho</label>
            <input type="text" value={form.size} onChange={(e) => handleChange('size', e.target.value)}
              placeholder="Ex: 30ml, 50g..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white" />
          </div>
        </div>

        {/* ── ESTOQUE: diferente para Adicionar vs Editar ── */}
        {!isEditing ? (
          /* NOVO PRODUTO: quantidade inicial simples */
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-rose-400" /> Quantidade inicial em estoque</span>
            </label>
            <input
              type="number" value={form.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              min="0" step="1" placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
            />
            <p className="text-xs text-gray-400 mt-1">Informe quantas unidades você tem agora.</p>
          </div>
        ) : (
          /* EDITAR PRODUTO: ajuste de estoque com motivo + histórico */
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" /> Ajuste de Estoque
              </h3>
              <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full">
                Atual: {currentStock} un.
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Quantidade a ajustar
              </label>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => setAdjustQty(v => String((parseInt(v) || 0) - 1))}
                  className="w-12 h-12 bg-white border border-gray-200 rounded-xl text-xl font-bold text-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors flex-shrink-0">
                  −
                </button>
                <input
                  type="number" value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="0 (sem alteração)"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-center text-gray-800 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
                <button type="button"
                  onClick={() => setAdjustQty(v => String((parseInt(v) || 0) + 1))}
                  className="w-12 h-12 bg-white border border-gray-200 rounded-xl text-xl font-bold text-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors flex-shrink-0">
                  +
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Use valores positivos para entrada (+10) e negativos para saída (−3).
              </p>
            </div>

            {/* Preview do novo estoque */}
            {adjustQty !== '' && adjustValue !== 0 && (
              <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
                newStockAfter < 0
                  ? 'bg-red-50 border border-red-200'
                  : adjustValue > 0
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-orange-50 border border-orange-200'
              }`}>
                <span className="text-sm font-medium text-gray-700">
                  {currentStock} {adjustValue > 0 ? '+' : ''}{adjustValue} =
                </span>
                <span className={`font-bold text-lg ${
                  newStockAfter < 0 ? 'text-red-600' : adjustValue > 0 ? 'text-green-700' : 'text-orange-600'
                }`}>
                  {newStockAfter} un.
                  {newStockAfter < 0 && ' ⚠️ Inválido'}
                </span>
              </div>
            )}

            {/* Motivo do ajuste */}
            {adjustQty !== '' && adjustValue !== 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Motivo do ajuste</label>
                <select value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none">
                  {ADJUSTMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            {/* Histórico de ajustes */}
            {adjustHistory.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-2">
                  <History className="w-3.5 h-3.5" /> Últimos ajustes
                </p>
                <div className="space-y-1.5">
                  {adjustHistory.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-bold shrink-0 ${a.adjustment > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {a.adjustment > 0 ? '+' : ''}{a.adjustment}
                        </span>
                        <span className="text-gray-500 truncate">{a.reason}</span>
                      </div>
                      <span className="text-gray-400 shrink-0 ml-2">
                        {new Date(a.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preços */}
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            <h3 className="font-bold text-gray-800 text-sm">Precificação</h3>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Preço de Compra (R$) <span className="text-rose-500">*</span>
            </label>
            <input type="number" value={form.purchase_price}
              onChange={(e) => handleChange('purchase_price', e.target.value)}
              step="0.01" min="0.01" placeholder="0,00"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Margem (%)</label>
              <div className="relative">
                <input type="number" value={form.profit_margin}
                  onChange={(e) => handleChange('profit_margin', e.target.value)}
                  step="0.01" min="0" placeholder="0,00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-8 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preço de Venda (R$)</label>
              <input type="number" value={form.sale_price}
                onChange={(e) => handleChange('sale_price', e.target.value)}
                step="0.01" min="0" placeholder="0,00"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white" />
            </div>
          </div>
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm flex items-start gap-2">
            <span className="mt-0.5">⚠️</span><span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-rose-200">
          {saving
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Save className="w-5 h-5" />{isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'}</>}
        </button>
      </form>

      {/* ── Modal Webcam ── */}
      {showWebcam && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-rose-500" />
                <span className="font-bold text-gray-800">Câmera</span>
              </div>
              <button onClick={closeWebcam} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-black aspect-video flex items-center justify-center">
              {webcamError ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <ZapOff className="w-10 h-10 text-red-400" />
                  <p className="text-white text-sm">{webcamError}</p>
                  <button onClick={closeWebcam} className="bg-white text-gray-800 font-semibold px-4 py-2 rounded-xl text-sm mt-1">Fechar</button>
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {!webcamReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </>
              )}
            </div>
            {!webcamError && (
              <div className="flex items-center justify-center gap-4 p-5">
                <button onClick={closeWebcam} className="px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">Cancelar</button>
                <button onClick={capturePhoto} disabled={!webcamReady}
                  className="px-8 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Capturar foto
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
