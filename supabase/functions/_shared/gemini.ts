import { record } from '../../../src/services/aiContracts'

export const defaultModel = 'gemini-3.1-flash-lite'
export type GeminiRequest = { prompt: string; data: unknown; schema: Record<string, unknown>; tokens: number }
export type GeminiResult = { kind: 'ok'; output: unknown } | { kind: 'quota' | 'invalid' | 'unavailable' }

export async function generate(key: string, model: string, input: GeminiRequest, fetcher: typeof fetch = fetch): Promise<GeminiResult> {
  if (!/^gemini-[\d.]+-flash(?:-lite)?(?:-preview(?:-\d{2}-\d{2})?)?$/.test(model)) return { kind: 'unavailable' }
  try {
    const response = await fetcher('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      redirect: 'error',
      signal: AbortSignal.timeout(14000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.prompt }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(input.data) }] }],
        generationConfig: {
          responseMimeType: 'application/json', responseJsonSchema: input.schema,
          temperature: 0.2, maxOutputTokens: input.tokens,
          ...(model.startsWith('gemini-3') ? { thinkingConfig: { thinkingLevel: 'minimal' } } : { thinkingConfig: { thinkingBudget: 0 } }),
        },
      }),
    })
    if (response.status === 429) return { kind: 'quota' }
    if (!response.ok) return { kind: 'unavailable' }
    const data: unknown = await response.json()
    if (!record(data) || !Array.isArray(data.candidates) || !record(data.candidates[0])) return { kind: 'invalid' }
    const { content, finishReason } = data.candidates[0]
    if (finishReason !== 'STOP' || !record(content) || !Array.isArray(content.parts)) return { kind: 'invalid' }
    const answer = content.parts.filter((part) => record(part) && part.thought !== true && typeof part.text === 'string')
      .map((part) => part.text).join('')
    if (!answer || answer.length > 24000) return { kind: 'invalid' }
    try {
      return { kind: 'ok', output: JSON.parse(answer) }
    } catch {
      return { kind: 'invalid' }
    }
  } catch {
    return { kind: 'unavailable' }
  }
}
