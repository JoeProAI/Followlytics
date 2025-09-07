'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Chrome, Shield, Zap } from 'lucide-react'

export default function ExtensionDownload() {
  const handleDownload = () => {
    // Create download link for the extension zip
    const link = document.createElement('a')
    link.href = '/followlytics-extension.zip'
    link.download = 'followlytics-extension.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
          <Chrome className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Download Followlytics Extension</CardTitle>
        <CardDescription>
          Get complete Twitter follower data with our Chrome extension
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Shield className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-green-900">100% Reliable</h3>
            <p className="text-sm text-green-700">Uses your own Twitter session</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Zap className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-900">Complete Data</h3>
            <p className="text-sm text-blue-700">All followers, not just samples</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Download className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-900">One-Click Setup</h3>
            <p className="text-sm text-purple-700">Install once, use forever</p>
          </div>
        </div>

        {/* Download Button */}
        <div className="text-center">
          <Button 
            onClick={handleDownload}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            <Download className="mr-2 h-5 w-5" />
            Download Extension (Free)
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Compatible with Chrome, Edge, and other Chromium browsers
          </p>
        </div>

        {/* Installation Steps */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Installation (2 minutes)</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Download & Extract</p>
                <p className="text-sm text-gray-600">Download the zip file and extract to a folder</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Open Chrome Extensions</p>
                <p className="text-sm text-gray-600">Go to <code className="bg-gray-200 px-1 rounded">chrome://extensions/</code></p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Enable Developer Mode</p>
                <p className="text-sm text-gray-600">Toggle "Developer mode" in the top right</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                4
              </div>
              <div>
                <p className="font-medium">Load Extension</p>
                <p className="text-sm text-gray-600">Click "Load unpacked" and select the extracted folder</p>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">After Installation:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Generate an API key in your dashboard above</li>
            <li>Click the extension icon and paste your API key</li>
            <li>Go to any Twitter followers page</li>
            <li>Click "Start Follower Scan" in the extension</li>
            <li>Watch as it automatically collects all followers</li>
          </ol>
        </div>

        {/* Why Extension is Required */}
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-2">Why Use Browser Extension?</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Twitter API Enterprise costs $42,000+/year for follower data</li>
            <li>• Web scraping gets blocked by Twitter's anti-bot systems</li>
            <li>• Extension uses your own logged-in session = 100% reliable</li>
            <li>• No rate limits, no blocks, complete follower access</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
