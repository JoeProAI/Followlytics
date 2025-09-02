import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from 'date-fns'

interface Unfollow {
  id: string
  unfollowerHandle: string
  unfollowerName: string
  unfollowerProfileImage: string
  timestamp: Date
  grokAnalysis?: {
    explanation: string
    confidence: number
    factors: string[]
  }
}

interface UnfollowListProps {
  unfollows: Unfollow[]
}

export function UnfollowList({ unfollows }: UnfollowListProps) {
  // Sample data for demo purposes
  const sampleUnfollows: Unfollow[] = [
    {
      id: '1',
      unfollowerHandle: 'john_doe',
      unfollowerName: 'John Doe',
      unfollowerProfileImage: 'https://pbs.twimg.com/profile_images/1234567890/avatar.jpg',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      grokAnalysis: {
        explanation: 'Likely unfollowed due to high posting frequency and political content that may not align with their interests.',
        confidence: 0.85,
        factors: ['high_frequency', 'political_content']
      }
    },
    {
      id: '2',
      unfollowerHandle: 'jane_smith',
      unfollowerName: 'Jane Smith',
      unfollowerProfileImage: 'https://pbs.twimg.com/profile_images/1234567891/avatar.jpg',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
    {
      id: '3',
      unfollowerHandle: 'tech_guru',
      unfollowerName: 'Tech Guru',
      unfollowerProfileImage: 'https://pbs.twimg.com/profile_images/1234567892/avatar.jpg',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      grokAnalysis: {
        explanation: 'Content shifted away from tech topics towards personal posts, reducing relevance for this follower.',
        confidence: 0.72,
        factors: ['off_brand_content', 'low_engagement']
      }
    }
  ]

  const displayUnfollows = unfollows.length > 0 ? unfollows : sampleUnfollows

  if (displayUnfollows.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No recent unfollows to display</p>
        <p className="text-sm text-gray-400 mt-2">This is good news! 🎉</p>
      </div>
    )
  }

  const getFactorColor = (factor: string) => {
    const colorMap: Record<string, string> = {
      'political_content': 'destructive',
      'controversial_topics': 'destructive',
      'high_frequency': 'secondary',
      'low_engagement': 'outline',
      'off_brand_content': 'secondary',
      'negative_sentiment': 'destructive'
    }
    return colorMap[factor] || 'outline'
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>When</TableHead>
            <TableHead>AI Analysis</TableHead>
            <TableHead>Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayUnfollows.map((unfollow) => (
            <TableRow key={unfollow.id}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={unfollow.unfollowerProfileImage} />
                    <AvatarFallback>
                      {unfollow.unfollowerName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{unfollow.unfollowerName}</p>
                    <p className="text-sm text-gray-500">@{unfollow.unfollowerHandle}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(unfollow.timestamp, { addSuffix: true })}
                </span>
              </TableCell>
              <TableCell>
                {unfollow.grokAnalysis ? (
                  <div className="space-y-2">
                    <p className="text-sm">{unfollow.grokAnalysis.explanation}</p>
                    <div className="flex flex-wrap gap-1">
                      {unfollow.grokAnalysis.factors.map((factor) => (
                        <Badge 
                          key={factor} 
                          variant={getFactorColor(factor) as any}
                          className="text-xs"
                        >
                          {factor.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Badge variant="outline">Free Plan - Upgrade for AI insights</Badge>
                )}
              </TableCell>
              <TableCell>
                {unfollow.grokAnalysis ? (
                  <Badge variant="secondary">
                    {Math.round(unfollow.grokAnalysis.confidence * 100)}%
                  </Badge>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
