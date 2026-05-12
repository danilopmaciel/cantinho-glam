/**
 * Comprime uma imagem usando Canvas API.
 * @param {File|Blob} file  - Arquivo original
 * @param {object}    opts
 * @param {number}    opts.maxDim  - Dimensão máxima (largura ou altura), em px
 * @param {number}    opts.quality - Qualidade JPEG 0-1
 * @returns {Promise<Blob>} JPEG comprimido
 */
export async function compressImage(file, { maxDim = 1200, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const { width, height } = img
      const scale  = Math.min(1, maxDim / Math.max(width, height))
      const w = Math.round(width  * scale)
      const h = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      // Fundo branco para imagens com transparência (PNG)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob falhou')),
        'image/jpeg',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Falha ao carregar imagem'))
    }

    img.src = objectUrl
  })
}

/**
 * Deriva a URL do thumbnail a partir da URL completa.
 * Ex.: .../abc123.jpg  →  .../abc123_thumb.jpg
 * Funciona mesmo para extensões maiúsculas ou sem extensão conhecida.
 */
export function getThumbUrl(url) {
  if (!url) return url
  return url.replace(/\.(jpe?g|png|webp)(\?.*)?$/i, '_thumb.jpg$2')
}
