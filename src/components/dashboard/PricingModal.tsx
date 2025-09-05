'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Check, Zap, Crown, Rocket, X } from 'lucide-react'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

const pricingPlans = [
  {
    name: 'Starter',
    price: '$19',
    period: '/month',
    description: 'Perfect for individuals and small accounts',
    priceId: 'price_starter_monthly', // Replace with actual Stripe price ID
    features: [
      'Up to 10K followers tracking',
      'Daily unfollower detection',
      'Basic analytics dashboard',
      'Email notifications',
      'Export data (CSV)',
      '7-day history'
    ],
    popular: false,
    color: 'blue'
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'For growing accounts and content creators',
    priceId: 'price_professional_monthly', // Replace with actual Stripe price ID
    features: [
      'Up to 100K followers tracking',
      'Real-time unfollower detection',
      'Advanced analytics & insights',
      'AI-powered follower analysis',
      'Competitor tracking',
      'Custom reports',
      '30-day history',
      'Priority support'
    ],
    popular: true,
    color: 'purple'
  },
  {
    name: 'Agency',
    price: '$149',
    period: '/month',
    description: 'For agencies and enterprise accounts',
    priceId: 'price_agency_monthly', // Replace with actual Stripe price ID
    features: [
      'Unlimited followers tracking',
      'Multi-account management',
      'White-label reports',
      'Advanced AI insights with Grok',
      'Custom integrations',
      'Dedicated account manager',
      'Unlimited history',
      '24/7 priority support'
    ],
    popular: false,
    color: 'gold'
  }
]

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (priceId: string, planName: string) => {
    try {
      setLoading(priceId)
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ priceId })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start subscription. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Upgrade to Followlytics Pro
              </DialogTitle>
              <DialogDescription className="text-lg mt-2">
                Unlock advanced analytics and AI-powered insights for your Twitter growth
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {pricingPlans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.popular ? 'border-primary ring-2 ring-primary/20' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    <Crown className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center mb-2">
                  {plan.name === 'Starter' && <Zap className="h-6 w-6 text-blue-600" />}
                  {plan.name === 'Professional' && <Crown className="h-6 w-6 text-purple-600" />}
                  {plan.name === 'Agency' && <Rocket className="h-6 w-6 text-yellow-600" />}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="mt-2">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.priceId, plan.name)}
                  disabled={loading === plan.priceId}
                >
                  {loading === plan.priceId ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    `Get ${plan.name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial. Cancel anytime. No setup fees.
          </p>
          <div className="flex items-center justify-center mt-4 space-x-6 text-xs text-muted-foreground">
            <span>✓ Secure payments with Stripe</span>
            <span>✓ 30-day money-back guarantee</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
