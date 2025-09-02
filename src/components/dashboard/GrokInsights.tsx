import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react"

interface GrokAnalysis {
  topFactors: string[]
  recommendations: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  riskLevel: 'low' | 'medium' | 'high'
}

interface GrokInsightsProps {
  analysis: GrokAnalysis | null
}

export function GrokInsights({ analysis }: GrokInsightsProps) {
  // Sample data for demo
  const sampleAnalysis: GrokAnalysis = {
    topFactors: ['high_frequency', 'political_content', 'controversial_topics'],
    recommendations: [
      'Reduce posting frequency to 3-5 times per day',
      'Balance political content with neutral topics',
      'Increase engagement with followers through replies'
    ],
    sentiment: 'negative',
    riskLevel: 'medium'
  }

  const displayAnalysis = analysis || sampleAnalysis

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <TrendingUp className="h-4 w-4" />
      case 'medium': return <AlertTriangle className="h-4 w-4" />
      case 'high': return <AlertTriangle className="h-4 w-4" />
      default: return <Brain className="h-4 w-4" />
    }
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI Insights
          </CardTitle>
          <CardDescription>Upgrade to unlock Grok analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Brain className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              Get AI-powered insights on why people unfollow you
            </p>
            <Button>Upgrade to Starter Plan</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="h-5 w-5 mr-2" />
          AI Insights
        </CardTitle>
        <CardDescription>Powered by xAI Grok</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Unfollow Risk</span>
          <div className={`flex items-center ${getRiskColor(displayAnalysis.riskLevel)}`}>
            {getRiskIcon(displayAnalysis.riskLevel)}
            <span className="ml-1 capitalize">{displayAnalysis.riskLevel}</span>
          </div>
        </div>

        {/* Top Factors */}
        <div>
          <h4 className="text-sm font-medium mb-2">Top Unfollow Factors</h4>
          <div className="flex flex-wrap gap-2">
            {displayAnalysis.topFactors.map((factor) => (
              <Badge key={factor} variant="outline">
                {factor.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Lightbulb className="h-4 w-4 mr-1" />
            Recommendations
          </h4>
          <ul className="space-y-2">
            {displayAnalysis.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-primary mr-2">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>

        {/* Sentiment */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span>Content Sentiment</span>
            <Badge 
              variant={displayAnalysis.sentiment === 'positive' ? 'default' : 
                      displayAnalysis.sentiment === 'neutral' ? 'secondary' : 'destructive'}
            >
              {displayAnalysis.sentiment}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
