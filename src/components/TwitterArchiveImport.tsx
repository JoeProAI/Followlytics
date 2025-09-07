'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportResult {
  success: boolean
  followers_imported?: number
  error?: string
  details?: string
}

export default function TwitterArchiveImport() {
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import/twitter-archive', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const jsonFile = files.find(file => file.name.endsWith('.json') || file.type === 'application/json')
    
    if (jsonFile) {
      handleFileUpload(jsonFile)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import Twitter Archive
        </CardTitle>
        <CardDescription>
          Upload your Twitter data export to import your complete followers list
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">How to get your Twitter data:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Go to Twitter Settings → "Your account" → "Download an archive of your data"</li>
            <li>Request your archive (takes 24-48 hours to process)</li>
            <li>Download the ZIP file when ready</li>
            <li>Extract and upload the "followers.json" file here</li>
          </ol>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
        >
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Drop your followers.json file here
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse files
          </p>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          <Button 
            asChild 
            variant="outline"
            disabled={isUploading}
          >
            <label htmlFor="file-upload" className="cursor-pointer">
              {isUploading ? 'Uploading...' : 'Choose File'}
            </label>
          </Button>
        </div>

        {/* Loading State */}
        {isUploading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Processing your followers data...</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-semibold ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? 'Import Successful!' : 'Import Failed'}
              </span>
            </div>
            
            {result.success && result.followers_imported && (
              <p className="text-green-800">
                Successfully imported {result.followers_imported.toLocaleString()} followers from your Twitter archive.
              </p>
            )}
            
            {result.error && (
              <div className="text-red-800">
                <p className="font-medium">{result.error}</p>
                {result.details && (
                  <p className="text-sm mt-1">{result.details}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Benefits */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Why use Twitter Archive?</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>100% Free:</strong> No API costs or subscriptions</li>
            <li>• <strong>Complete Data:</strong> All your followers, not just a sample</li>
            <li>• <strong>Official Source:</strong> Direct from Twitter, no scraping needed</li>
            <li>• <strong>No Rate Limits:</strong> Import as many times as you want</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
