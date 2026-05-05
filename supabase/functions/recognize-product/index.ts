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

    const prompt = `Analise a imagem e identifique QUALQUER produto visível (cosméticos, perfumes, esmaltes, acessórios de beleza, etc.).
Extraia o que conseguir, mesmo que parcial — preencha os campos que tiver certeza, deixe os outros como null.
Só use {"error":true} se a imagem realmente não tem nenhum produto identificável (ex.: paisagem, pessoa sem produto, foto totalmente ilegível).
NÃO inclua campos extras, NÃO escreva justificativas, NÃO adicione "message" ou comentários.
Formato esperado quando identifica: {"name":"...","brand":"...","type":"...","color":null|"...","size":null|"...","quantity":1}`

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        name:     { type: 'STRING',  nullable: true },
        brand:    { type: 'STRING',  nullable: true },
        type:     { type: 'STRING',  nullable: true },
        color:    { type: 'STRING',  nullable: true },
        size:     { type: 'STRING',  nullable: true },
        quantity: { type: 'NUMBER',  nullable: true },
        error:    { type: 'BOOLEAN', nullable: true },
      },
    }

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
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
            responseSchema,
          },
        }),
      }
    )

    const geminiJson = await geminiRes.json()

    if (!geminiRes.ok) {
      const status      = geminiRes.status
      const apiMsg      = geminiJson?.error?.message || `Gemini HTTP ${status}`
      const apiStatus   = geminiJson?.error?.status  || ''   // ex: RESOURCE_EXHAUSTED, PERMISSION_DENIED
      const isQuota     = status === 429 || apiStatus === 'RESOURCE_EXHAUSTED'
      const isAuth      = status === 401 || status === 403
      const errorCode   = isQuota ? 'quota_exceeded' : isAuth ? 'auth_error' : 'gemini_error'

      // Log estruturado completo para debug futuro
      console.error('Gemini API error:', JSON.stringify({
        httpStatus: status,
        apiStatus,
        apiMsg,
        errorCode,
        details: geminiJson?.error?.details,
      }))

      const userMsg = isQuota
        ? 'Cota da IA atingida no momento. Tente novamente em alguns minutos.'
        : isAuth
          ? 'Erro de autenticação com o serviço de IA. Avise o administrador.'
          : 'Erro temporário ao processar a imagem. Tente novamente.'

      // Retorna 200 com error flag para não disparar FunctionsHttpError no cliente
      return new Response(
        JSON.stringify({ error: true, code: errorCode, message: userMsg, debug: apiMsg }),
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
