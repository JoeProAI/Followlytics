// Enhanced Gamma API Integration
// Full API v1.0 capabilities with all bells and whistles

export interface GammaGenerationOptions {
  // Content
  inputText: string
  textMode: 'generate' | 'condense' | 'preserve'
  
  // Format
  format?: 'presentation' | 'document' | 'social' | 'webpage'
  numCards?: number // 1-75 cards
  cardSplit?: 'auto' | 'manual'
  
  // Styling
  themeId?: string
  
  // Images
  imageOptions?: {
    source?: 'aiGenerated' | 'unsplash' | 'giphy' | 'webAllImages' | 'noImages'
    model?: 'flux-1-pro' | 'dall-e-3' | 'stable-diffusion'
    style?: string // e.g., "photorealistic, vibrant, modern"
  }
  
  // Text customization
  textOptions?: {
    amount?: 'brief' | 'medium' | 'detailed'
    tone?: string // e.g., "professional", "casual", "humorous"
    audience?: string // e.g., "executives", "developers", "general public"
    language?: string // ISO 639-1 code, defaults to 'en'
  }
  
  // Card options
  cardOptions?: {
    dimensions?: '16:9' | '4:3' | '1:1' | '9:16' // Social, web, etc.
    headerFooter?: boolean
  }
  
  // Export
  exportAs?: 'pdf' | 'pptx' | 'both'
  
  // Organization
  folderIds?: string[]
  additionalInstructions?: string
  
  // Sharing
  sharingOptions?: {
    workspaceAccess?: 'view' | 'comment' | 'edit'
    externalAccess?: 'no_access' | 'view' | 'comment'
  }
}

export interface GammaGenerationResult {
  id: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  urls?: {
    gamma?: string
    pdf?: string
    pptx?: string
  }
  warnings?: string[]
  error?: string
}

export class GammaEnhanced {
  private apiKey: string
  private baseUrl = 'https://public-api.gamma.app/v1.0'
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  /**
   * Generate a Gamma with full API capabilities
   */
  async generate(options: GammaGenerationOptions): Promise<GammaGenerationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/generations`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputText: options.inputText,
          textMode: options.textMode,
          format: options.format || 'presentation',
          numCards: options.numCards || 10,
          cardSplit: options.cardSplit || 'auto',
          themeId: options.themeId,
          imageOptions: options.imageOptions || {
            source: 'aiGenerated',
            model: 'flux-1-pro',
            style: 'modern, vibrant, professional'
          },
          textOptions: options.textOptions || {
            amount: 'medium',
            language: 'en'
          },
          cardOptions: options.cardOptions,
          exportAs: options.exportAs,
          folderIds: options.folderIds,
          additionalInstructions: options.additionalInstructions,
          sharingOptions: options.sharingOptions
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gamma API error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      
      return {
        id: data.id || data.generationId,
        status: 'pending',
        warnings: data.warnings
      }
      
    } catch (error: any) {
      console.error('[GammaEnhanced] Generation error:', error)
      throw error
    }
  }
  
  /**
   * Check generation status and get URLs
   */
  async getStatus(generationId: string): Promise<GammaGenerationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/generations/${generationId}`, {
        headers: {
          'X-API-Key': this.apiKey
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.status}`)
      }
      
      const data = await response.json()
      
      return {
        id: generationId,
        status: data.status,
        urls: {
          gamma: data.url || data.gammaUrl,
          pdf: data.pdfUrl,
          pptx: data.pptxUrl
        },
        warnings: data.warnings
      }
      
    } catch (error: any) {
      console.error('[GammaEnhanced] Status check error:', error)
      throw error
    }
  }
  
  /**
   * Poll for completion (recommended 5 second intervals)
   */
  async waitForCompletion(
    generationId: string, 
    options?: {
      maxWaitTime?: number // milliseconds, default 180000 (3 min)
      pollInterval?: number // milliseconds, default 5000 (5 sec)
      onProgress?: (status: GammaGenerationResult) => void
    }
  ): Promise<GammaGenerationResult> {
    const maxWaitTime = options?.maxWaitTime || 180000 // 3 minutes
    const pollInterval = options?.pollInterval || 5000 // 5 seconds
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getStatus(generationId)
      
      if (options?.onProgress) {
        options.onProgress(status)
      }
      
      if (status.status === 'completed') {
        return status
      }
      
      if (status.status === 'failed') {
        throw new Error('Gamma generation failed')
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
    
    throw new Error('Gamma generation timeout')
  }
  
  /**
   * List available themes
   */
  async listThemes(): Promise<Array<{ id: string; name: string; preview?: string }>> {
    const response = await fetch(`${this.baseUrl}/themes`, {
      headers: {
        'X-API-Key': this.apiKey
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch themes')
    }
    
    return await response.json()
  }
  
  /**
   * List folders
   */
  async listFolders(): Promise<Array<{ id: string; name: string }>> {
    const response = await fetch(`${this.baseUrl}/folders`, {
      headers: {
        'X-API-Key': this.apiKey
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch folders')
    }
    
    return await response.json()
  }
}

// Export singleton instance
let gammaInstance: GammaEnhanced | null = null

export function getGammaClient(): GammaEnhanced {
  if (!gammaInstance) {
    const apiKey = process.env.GAMMA_API_KEY
    if (!apiKey) {
      throw new Error('GAMMA_API_KEY environment variable is not set')
    }
    gammaInstance = new GammaEnhanced(apiKey)
  }
  return gammaInstance
}
