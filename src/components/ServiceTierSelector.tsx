'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, Star, Zap, Crown } from 'lucide-react'

interface ServiceTier {
  id: string
  name: string
  price: string
  description: string
  icon: React.ReactNode
  features: string[]
  limitations: string[]
  recommended?: boolean
}

const serviceTiers: ServiceTier[] = [
  {
    id: 'oauth',
    name: 'OAuth Integration',
    price: 'Free',
    description: 'Use Twitter API with user authorization',
    icon: <Zap className="h-5 w-5" />,
    features: [
      'Legitimate Twitter API access',
      'User authorizes via OAuth',
      'Access to private followers',
      'No TOS violations',
      'Reliable authentication'
    ],
    limitations: [
      'Limited to 15 requests per 15 minutes',
      'Max ~900 followers per hour',
      'Requires user to authorize app',
      'Twitter API Pro subscription needed ($200/month)'
    ]
  },
  {
    id: 'browser-extension',
    name: 'Browser Extension',
    price: 'Coming Soon',
    description: 'Chrome extension for user-initiated scraping',
    icon: <Star className="h-5 w-5" />,
    features: [
      'Uses user\'s own Twitter session',
      'Access to complete follower lists',
      'No rate limiting issues',
      'Privacy-friendly (no credentials shared)',
      'High success rate (95%+)'
    ],
    limitations: [
      'Requires Chrome extension installation',
      'User must manually initiate scraping',
      'Currently in development',
      'One-time setup required'
    ],
    recommended: true
  },
  {
    id: 'octoparse',
    name: 'Octoparse Scraping',
    price: '$69-249/month',
    description: 'Professional web scraping service',
    icon: <Crown className="h-5 w-5" />,
    features: [
      'No user setup required',
      'Advanced anti-detection',
      'Cloud-based processing',
      'Handles CAPTCHAs automatically',
      'Professional scraping infrastructure'
    ],
    limitations: [
      'Public accounts only',
      'Violates Twitter TOS',
      'Success rate 30-60%',
      'Additional costs for proxies/CAPTCHAs',
      'Incomplete data (~200-500 followers max)'
    ]
  }
]

export default function ServiceTierSelector() {
  const [selectedTier, setSelectedTier] = useState<string>('browser-extension')

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Follower Scraping Method
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Select the best approach for your Followlytics service based on your needs and user requirements
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {serviceTiers.map((tier) => (
          <Card 
            key={tier.id}
            className={`relative cursor-pointer transition-all duration-200 ${
              selectedTier === tier.id 
                ? 'ring-2 ring-blue-500 shadow-lg' 
                : 'hover:shadow-md'
            } ${tier.recommended ? 'border-blue-200 bg-blue-50' : ''}`}
            onClick={() => setSelectedTier(tier.id)}
          >
            {tier.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-3 py-1">
                  Recommended
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-2">
                <div className={`p-3 rounded-full ${
                  tier.recommended ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tier.icon}
                </div>
              </div>
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <div className="text-2xl font-bold text-blue-600">{tier.price}</div>
              <CardDescription className="text-sm">
                {tier.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Features */}
              <div>
                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Features
                </h4>
                <ul className="space-y-1">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="text-sm text-green-800 flex items-start gap-2">
                      <Check className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limitations */}
              <div>
                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Limitations
                </h4>
                <ul className="space-y-1">
                  {tier.limitations.map((limitation, index) => (
                    <li key={index} className="text-sm text-red-800 flex items-start gap-2">
                      <X className="h-3 w-3 mt-0.5 flex-shrink-0 text-red-600" />
                      {limitation}
                    </li>
                  ))}
                </ul>
              </div>

              <Button 
                className={`w-full mt-4 ${
                  selectedTier === tier.id 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
                onClick={() => setSelectedTier(tier.id)}
              >
                {selectedTier === tier.id ? 'Selected' : 'Select This Method'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Tier Details */}
      {selectedTier && (
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">
              Next Steps for {serviceTiers.find(t => t.id === selectedTier)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTier === 'oauth' && (
              <div className="space-y-3 text-blue-800">
                <p>✅ OAuth integration is already implemented in your dashboard</p>
                <p>✅ Users can authorize via Twitter OAuth 1.0a</p>
                <p>⚠️ Requires Twitter API Pro subscription ($200/month)</p>
                <p>📊 Limited to ~900 followers per hour due to rate limits</p>
              </div>
            )}
            
            {selectedTier === 'browser-extension' && (
              <div className="space-y-3 text-blue-800">
                <p>🚧 Browser extension is currently in development</p>
                <p>📅 Expected completion: 2-3 weeks</p>
                <p>🎯 Will provide the best user experience and data completeness</p>
                <p>💡 Users install once and can scrape anytime with one click</p>
              </div>
            )}
            
            {selectedTier === 'octoparse' && (
              <div className="space-y-3 text-blue-800">
                <p>✅ Octoparse integration is already implemented</p>
                <p>💰 Requires Octoparse subscription ($69-249/month)</p>
                <p>⚠️ Limited to public accounts only</p>
                <p>📉 Success rate varies (30-60%) due to Twitter's anti-bot measures</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
