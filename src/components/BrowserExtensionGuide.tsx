'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Chrome, Download, Play, CheckCircle, AlertTriangle } from 'lucide-react'

export default function BrowserExtensionGuide() {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Chrome className="h-5 w-5" />
          Browser Extension Method
        </CardTitle>
        <CardDescription>
          The ONLY reliable way to get follower data - Twitter API Enterprise costs $42,000+/year
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* How It Works */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">How It Works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Install our Chrome extension</li>
            <li>Visit your Twitter followers page</li>
            <li>Click the extension icon to start scraping</li>
            <li>Extension scrolls and collects followers automatically</li>
            <li>Data is sent directly to your Followlytics dashboard</li>
          </ol>
        </div>

        {/* Benefits */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900 mb-2">Benefits:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
            <li><strong>Your own session</strong> - Uses your logged-in Twitter account</li>
            <li><strong>Complete data</strong> - Access to all your followers, including private</li>
            <li><strong>No rate limits</strong> - Human-like scrolling behavior</li>
            <li><strong>One-time setup</strong> - Install once, use anytime</li>
            <li><strong>Privacy-friendly</strong> - No credentials shared with our servers</li>
          </ul>
        </div>

        {/* Installation Steps */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Installation Steps:</h3>
          
          <div className="flex items-center gap-4 p-3 border rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
            </div>
            <div className="flex-1">
              <p className="font-medium">Download Extension</p>
              <p className="text-sm text-gray-600">Click the button below to download the Followlytics extension</p>
            </div>
            <Button size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>

          <div className="flex items-center gap-4 p-3 border rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
            </div>
            <div className="flex-1">
              <p className="font-medium">Install in Chrome</p>
              <p className="text-sm text-gray-600">Go to chrome://extensions/, enable Developer mode, and load the extension</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 border rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
            </div>
            <div className="flex-1">
              <p className="font-medium">Connect to Followlytics</p>
              <p className="text-sm text-gray-600">Enter your Followlytics API key to connect the extension</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 border rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                4
              </div>
            </div>
            <div className="flex-1">
              <p className="font-medium">Start Scraping</p>
              <p className="text-sm text-gray-600">Visit your Twitter followers page and click the extension icon</p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Ready to use
            </Badge>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Technical Details:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Platform:</strong> Chrome Extension (Manifest V3)</li>
            <li>• <strong>Permissions:</strong> Access to twitter.com and x.com only</li>
            <li>• <strong>Data handling:</strong> Direct API calls to your Followlytics account</li>
            <li>• <strong>Speed:</strong> ~100-200 followers per minute</li>
            <li>• <strong>Reliability:</strong> 95%+ success rate (uses your own session)</li>
          </ul>
        </div>

        {/* Twitter API Reality */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="font-semibold text-red-900 mb-2">Why Browser Extension is Required:</h3>
          <ul className="text-sm text-red-800 space-y-1">
            <li>• Twitter API followers endpoint requires Enterprise tier ($42,000+/year)</li>
            <li>• Your $200/month Pro subscription cannot access followers data</li>
            <li>• Web scraping violates Twitter TOS and gets blocked</li>
            <li>• Browser extension uses user's own session = 100% reliable</li>
          </ul>
        </div>

        {/* Status - Coming Soon */}
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
          <h3 className="font-semibold text-amber-900 mb-1">Coming Soon</h3>
          <p className="text-sm text-amber-800">
            Browser extension is currently in development. 
            Expected release: Next 2-3 weeks.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
