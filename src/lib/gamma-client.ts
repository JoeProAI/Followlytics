// Gamma API Client - Generate AI presentations from follower data
// https://developers.gamma.app/reference

interface GammaGenerateOptions {
  text: string // User's prompt + follower data
  type?: 'presentation' | 'document' | 'webpage'
  themeId?: string
  folderIds?: string[]
  imageOptions?: {
    model?: string // 'dalle3' | 'sdxl' | 'flux' etc
    searchQuery?: string
  }
  textOptions?: {
    language?: string // 'English' | 'Spanish' | 'French' etc
    tone?: 'professional' | 'casual' | 'enthusiastic' | 'formal'
    audience?: string
    detailLevel?: 'brief' | 'moderate' | 'comprehensive'
  }
}

interface GammaResponse {
  gamma_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  urls?: {
    view: string
    pdf?: string
    pptx?: string
  }
  message?: string
}

class GammaClient {
  private apiKey: string
  private baseUrl = 'https://public-api.gamma.app/v1.0'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GAMMA_API_KEY || ''
    
    if (!this.apiKey) {
      throw new Error('Gamma API key required. Set GAMMA_API_KEY environment variable.')
    }
  }

  /**
   * Generate a presentation/document using Gamma AI
   */
  async generate(options: GammaGenerateOptions): Promise<GammaResponse> {
    try {
      const payload: any = {
        inputText: options.text, // Gamma expects 'inputText' not 'text'
        textMode: 'generate', // REQUIRED by Gamma API
        format: options.type || 'presentation', // 'format' not 'type'
        numCards: 10,
        cardSplit: 'auto'
      }

      // Add optional params
      if (options.themeId) payload.themeId = options.themeId
      if (options.folderIds) payload.folderIds = options.folderIds
      
      // Image options (only model is supported)
      if (options.imageOptions?.model) {
        payload.imageOptions = {
          model: options.imageOptions.model
        }
      }
      
      // Text options (language must be language code like 'en', not 'English')
      if (options.textOptions?.language) {
        const langMap: Record<string, string> = {
          'English': 'en',
          'Spanish': 'es',
          'French': 'fr',
          'German': 'de',
          'Chinese': 'zh-cn',
          'Japanese': 'ja',
          'Korean': 'ko'
        }
        payload.textOptions = {
          language: langMap[options.textOptions.language] || options.textOptions.language || 'en'
        }
      }

      const response = await fetch(`${this.baseUrl}/generations`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey, // Gamma uses X-API-KEY header
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('[Gamma] API error response:', data)
        throw new Error(`Gamma API error (${response.status}): ${data.message || data.error || response.statusText}`)
      }
      
      return {
        gamma_id: data.generationId, // Gamma returns 'generationId'
        status: 'processing',
        message: 'Generation started'
      }
    } catch (error: any) {
      console.error('[Gamma] Generation failed:', error)
      throw error
    }
  }

  /**
   * Check status and get file URLs for a generated gamma
   */
  async getFileUrls(gammaId: string): Promise<GammaResponse> {
    try {
      // Check generation status first
      const response = await fetch(`${this.baseUrl}/generations/${gammaId}`, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Accept': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('[Gamma] Status check error:', data)
        throw new Error(`Failed to get Gamma status (${response.status}): ${data.message || response.statusText}`)
      }
      
      console.log('[Gamma] Full API response for', gammaId, ':', JSON.stringify(data, null, 2))
      
      // Check if still processing
      if (data.status === 'processing' || data.status === 'pending') {
        return {
          gamma_id: gammaId,
          status: data.status,
          message: 'Generation in progress...'
        }
      }
      
      // If completed, extract URL - Gamma uses 'webUrl' field
      let viewUrl = data.webUrl || data.viewUrl || data.view_url || data.url || data.gamma_url
      
      // FALLBACK: Construct Gamma URL if not provided (Gamma has predictable URL structure)
      if (!viewUrl && (data.status === 'completed' || data.status === 'success')) {
        viewUrl = `https://gamma.app/docs/${gammaId}`
        console.log('[Gamma] No URL in response, using constructed URL:', viewUrl)
      }
      
      console.log('[Gamma] Extracted view URL:', viewUrl)
      console.log('[Gamma] Status:', data.status)
      
      // If no URL found but status is complete, log all fields for debugging
      if (!viewUrl && data.status === 'completed') {
        console.error('[Gamma] WARNING: No URL found in completed generation! Available fields:', Object.keys(data))
      }
      
      return {
        gamma_id: gammaId,
        status: data.status || 'completed',
        urls: viewUrl ? {
          view: viewUrl,
          pdf: data.pdfUrl || data.pdf_url,
          pptx: data.pptxUrl || data.pptx_url
        } : undefined,
        message: viewUrl ? 'Generation complete' : 'Completed but URL not available yet'
      }
    } catch (error: any) {
      console.error('[Gamma] Failed to check status:', error)
      throw error
    }
  }

  /**
   * Create from template
   */
  async createFromTemplate(templateId: string, data: Record<string, any>): Promise<GammaResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/create-from-template`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          templateId: templateId,
          data: data
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(`Failed to create from template (${response.status}): ${result.message || response.statusText}`)
      }
      
      return {
        gamma_id: result.generationId || result.gamma_id,
        status: result.status || 'processing'
      }
    } catch (error: any) {
      console.error('[Gamma] Template creation failed:', error)
      throw error
    }
  }

  /**
   * List available themes
   */
  async listThemes(): Promise<Array<{ id: string, name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/themes`, {
        headers: {
          'X-API-KEY': this.apiKey,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to list themes: ${response.statusText}`)
      }

      const data = await response.json()
      return data.themes || []
    } catch (error: any) {
      console.error('[Gamma] Failed to list themes:', error)
      return []
    }
  }
}

// Singleton instance
let gammaClient: GammaClient | null = null

export function getGammaClient(): GammaClient {
  if (!gammaClient) {
    gammaClient = new GammaClient()
  }
  return gammaClient
}

export type { GammaGenerateOptions, GammaResponse }
export { GammaClient }
