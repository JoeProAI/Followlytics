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
  status: 'processing' | 'completed' | 'failed'
  urls?: {
    view: string
    pdf?: string
    pptx?: string
  }
  message?: string
}

class GammaClient {
  private apiKey: string
  private baseUrl = 'https://api.gamma.app/api/v1'

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
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: options.text,
          type: options.type || 'presentation',
          theme_id: options.themeId,
          folder_ids: options.folderIds,
          image_options: options.imageOptions ? {
            model: options.imageOptions.model || 'dalle3',
            search_query: options.imageOptions.searchQuery
          } : undefined,
          text_options: options.textOptions ? {
            language: options.textOptions.language || 'English',
            tone: options.textOptions.tone || 'professional',
            audience: options.textOptions.audience,
            detail_level: options.textOptions.detailLevel || 'comprehensive'
          } : undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Gamma API error: ${error.message || response.statusText}`)
      }

      const data = await response.json()
      
      return {
        gamma_id: data.gamma_id,
        status: data.status || 'processing',
        message: data.message
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
      const response = await fetch(`${this.baseUrl}/gamma/${gammaId}/files`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get Gamma URLs: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        gamma_id: gammaId,
        status: data.status,
        urls: {
          view: data.view_url,
          pdf: data.pdf_url,
          pptx: data.pptx_url
        }
      }
    } catch (error: any) {
      console.error('[Gamma] Failed to get file URLs:', error)
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
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: templateId,
          data: data
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create from template: ${response.statusText}`)
      }

      const result = await response.json()
      
      return {
        gamma_id: result.gamma_id,
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
          'Authorization': `Bearer ${this.apiKey}`
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
