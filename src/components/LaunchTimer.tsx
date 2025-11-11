'use client'

import { useState, useEffect } from 'react'

const LAUNCH_END = new Date('2025-11-17T23:59:59').getTime() // 7 days from now

export default function LaunchTimer() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  const [isLaunched, setIsLaunched] = useState(true)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now()
      const difference = LAUNCH_END - now

      if (difference <= 0) {
        setIsLaunched(false)
        return
      }

      setIsLaunched(true)
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      })
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!isLaunched) return null

  return (
    <div className="bg-white text-black border-b border-gray-200 py-3 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-medium text-sm">Launch Week</div>
            <div className="text-xs text-gray-600">50% off</div>
          </div>
        </div>
        
        <div className="flex gap-3 font-mono text-sm">
          <div className="flex flex-col items-center">
            <div className="font-medium">{timeLeft.days}</div>
            <div className="text-xs text-gray-500">DAYS</div>
          </div>
          <div className="text-gray-400">:</div>
          <div className="flex flex-col items-center">
            <div className="font-medium">{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className="text-xs text-gray-500">HRS</div>
          </div>
          <div className="text-gray-400">:</div>
          <div className="flex flex-col items-center">
            <div className="font-medium">{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className="text-xs text-gray-500">MIN</div>
          </div>
          <div className="text-gray-400">:</div>
          <div className="flex flex-col items-center">
            <div className="font-medium">{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className="text-xs text-gray-500">SEC</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function isLaunchWeek(): boolean {
  return Date.now() < LAUNCH_END
}

export function getLaunchDiscount(price: number): number {
  if (!isLaunchWeek()) return price
  return Math.round(price * 0.5) // 50% off
}
