import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface FollowerData {
  date: string
  followers: number
  gained: number
  lost: number
}

interface FollowerChartProps {
  data: FollowerData[]
}

export function FollowerChart({ data }: FollowerChartProps) {
  // Sample data for demo purposes
  const sampleData = [
    { date: '2024-01-01', followers: 1200, gained: 5, lost: 2 },
    { date: '2024-01-02', followers: 1203, gained: 8, lost: 5 },
    { date: '2024-01-03', followers: 1206, gained: 12, lost: 9 },
    { date: '2024-01-04', followers: 1209, gained: 6, lost: 3 },
    { date: '2024-01-05', followers: 1212, gained: 15, lost: 12 },
    { date: '2024-01-06', followers: 1215, gained: 9, lost: 6 },
    { date: '2024-01-07', followers: 1218, gained: 11, lost: 8 },
  ]

  const chartData = data.length > 0 ? data : sampleData

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              name === 'followers' ? 'Followers' : 
              name === 'gained' ? 'Gained' : 'Lost'
            ]}
          />
          <Line 
            type="monotone" 
            dataKey="followers" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
