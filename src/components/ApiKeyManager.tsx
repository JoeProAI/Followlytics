'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Copy, Eye, EyeOff, Key, Plus, Trash2, Download } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  key: string
  created_at: string
  last_used?: string
  usage_count: number
}

export default function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showKeys, setShowKeys] = useState<{[key: string]: boolean}>({})
  const [newKeyName, setNewKeyName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/user/api-keys', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.api_keys || [])
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const generateApiKey = async () => {
    if (!newKeyName.trim()) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newKeyName.trim() })
      })

      if (response.ok) {
        const data = await response.json()
        setApiKeys(prev => [...prev, data.api_key])
        setNewKeyName('')
      }
    } catch (error) {
      console.error('Failed to generate API key:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        setApiKeys(prev => prev.filter(key => key.id !== keyId))
      }
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }))
  }

  const maskKey = (key: string) => {
    return `${key.substring(0, 8)}${'*'.repeat(20)}${key.substring(key.length - 4)}`
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys for Browser Extension
        </CardTitle>
        <CardDescription>
          Generate API keys to connect the Followlytics browser extension to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generate New Key */}
        <div className="flex gap-3">
          <Input
            placeholder="Enter a name for this API key (e.g., 'Chrome Extension')"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={generateApiKey}
            disabled={!newKeyName.trim() || isGenerating}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate Key'}
          </Button>
        </div>

        {/* Extension Download */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Download Browser Extension</h3>
              <p className="text-sm text-blue-700 mt-1">
                Download and install the Chrome extension to start tracking followers
              </p>
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Extension
            </Button>
          </div>
        </div>

        {/* API Keys List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Your API Keys</h3>
          
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Key className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No API keys generated yet</p>
              <p className="text-sm">Generate your first API key to use the browser extension</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                      <p className="text-sm text-gray-500">
                        Created {new Date(apiKey.created_at).toLocaleDateString()}
                        {apiKey.last_used && ` • Last used ${new Date(apiKey.last_used).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {apiKey.usage_count} uses
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteApiKey(apiKey.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono text-sm bg-gray-50 p-2 rounded border">
                      {showKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                    >
                      {showKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(apiKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Generate an API key above</li>
            <li>Download and install the browser extension</li>
            <li>Open the extension and paste your API key</li>
            <li>Go to any Twitter followers page and click "Start Scan"</li>
            <li>View results in your Followlytics dashboard</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
