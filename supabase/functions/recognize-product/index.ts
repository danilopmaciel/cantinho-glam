// Supabase Edge Function — Reconhecimento de produto via Gemini
// A chave da API fica aqui no servidor, nunca exposta ao browser.

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    const { imageBase64, mimeType } = await req.json()

    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 e mimeType são obrigatórios.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: 'Chave Gemini não configurada no servidor.' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = `Analise a imagem e identifique o produto de beleza/cosméticos. Responda APENAS com JSON puro, sem markdown, sem explicações:
{"name":"nome do produto","brand":"marca","type":"tipo (esmalte, batom, base, etc)","color":"cor ou null","size":"tamanho/volume ou null","quantity":1}
Se não identificar: {"error":true}`

    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'X-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      }
    )

    const geminiJson = await geminiRes.json()

    if (!geminiRes.ok) {
      const msg = geminiJson.error?.message || `Gemini HTTP ${geminiRes.status}`
      console.error('Gemini API error:', msg)
      // Retorna 200 com error flag para não disparar FunctionsHttpError no cliente
      return new Response(
        JSON.stringify({ error: true, message: msg }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    const stripped = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const match   = stripped.match(/\{[\s\S]*\}/)

    if (!match) {
      return new Response(
        JSON.stringify({ error: true }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(match[0], {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Erro inesperado.' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
